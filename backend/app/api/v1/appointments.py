from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.doctors import _get_doctor_or_404
from app.api.v1.patients import _get_patient_or_404
from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.appointment import (
    Appointment,
    AppointmentStatus,
    ConsultationMessage,
    DoctorAvailabilitySlot,
)
from app.models.doctor import Doctor
from app.models.prescription import Prescription
from app.models.user import User, UserRole
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentStatusUpdate,
    ConsultationMessageCreate,
    ConsultationMessageResponse,
)
from app.schemas.prescription import PrescriptionCreate, PrescriptionResponse
from app.services.notifications import get_notification_service, notify_booking_confirmation

router = APIRouter(prefix="/appointments", tags=["appointments"])

ALLOWED_TRANSITIONS: dict[AppointmentStatus, set[AppointmentStatus]] = {
    AppointmentStatus.pending: {AppointmentStatus.confirmed, AppointmentStatus.rejected, AppointmentStatus.cancelled},
    AppointmentStatus.confirmed: {AppointmentStatus.completed, AppointmentStatus.cancelled},
    AppointmentStatus.rejected: set(),
    AppointmentStatus.cancelled: set(),
    AppointmentStatus.completed: set(),
}


def _ensure_aware(dt: datetime) -> datetime:
    """SQLite drops tzinfo on read even for timezone-aware columns; Postgres preserves it. Normalize to UTC."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _get_appointment_or_404(db: Session, appointment_id: int) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return appointment


def _to_response(appointment: Appointment) -> AppointmentResponse:
    return AppointmentResponse(
        id=appointment.id,
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        slot_id=appointment.slot_id,
        consultation_mode=appointment.consultation_mode,
        status=appointment.status,
        meeting_url=appointment.meeting_url,
        notes=appointment.notes,
        start_time=appointment.slot.start_time,
        end_time=appointment.slot.end_time,
        created_at=appointment.created_at,
        updated_at=appointment.updated_at,
    )


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate,
    current_user: User = Depends(require_role(UserRole.patient)),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, current_user.id)

    doctor = db.get(Doctor, payload.doctor_id)
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    if not doctor.user.is_approved:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor is not approved yet")

    slot = db.get(DoctorAvailabilitySlot, payload.slot_id)
    if slot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability slot not found")
    if slot.doctor_id != doctor.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Slot does not belong to the selected doctor"
        )
    if slot.is_booked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This slot is already booked")
    if _ensure_aware(slot.start_time) <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This slot is no longer available")

    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        slot_id=slot.id,
        consultation_mode=payload.consultation_mode,
        notes=payload.notes,
        status=AppointmentStatus.pending,
    )
    slot.is_booked = True
    db.add(appointment)
    notify_booking_confirmation(db, get_notification_service(), current_user, doctor.full_name)
    db.commit()
    db.refresh(appointment)
    return _to_response(appointment)


@router.get("/me", response_model=list[AppointmentResponse])
def list_my_appointments(
    current_user: User = Depends(require_role(UserRole.patient)),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, current_user.id)
    appointments = (
        db.query(Appointment).filter(Appointment.patient_id == patient.id).order_by(Appointment.created_at.desc()).all()
    )
    return [_to_response(a) for a in appointments]


@router.get("/doctor/me", response_model=list[AppointmentResponse])
def list_doctor_appointments(
    current_user: User = Depends(require_role(UserRole.doctor)),
    db: Session = Depends(get_db),
):
    doctor = _get_doctor_or_404(db, current_user.id)
    appointments = (
        db.query(Appointment).filter(Appointment.doctor_id == doctor.id).order_by(Appointment.created_at.desc()).all()
    )
    return [_to_response(a) for a in appointments]


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appointment = _get_appointment_or_404(db, appointment_id)

    if current_user.role == UserRole.admin:
        pass
    elif current_user.role == UserRole.patient:
        patient = _get_patient_or_404(db, current_user.id)
        if appointment.patient_id != patient.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your appointment")
    elif current_user.role == UserRole.doctor:
        doctor = _get_doctor_or_404(db, current_user.id)
        if appointment.doctor_id != doctor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your appointment")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this appointment")

    return _to_response(appointment)


@router.patch("/{appointment_id}/status", response_model=AppointmentResponse)
def update_appointment_status(
    appointment_id: int,
    payload: AppointmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appointment = _get_appointment_or_404(db, appointment_id)

    if current_user.role == UserRole.doctor:
        doctor = _get_doctor_or_404(db, current_user.id)
        if appointment.doctor_id != doctor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your appointment")
        if payload.status not in (AppointmentStatus.confirmed, AppointmentStatus.rejected, AppointmentStatus.completed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Doctors can only confirm, reject, or complete appointments",
            )
    elif current_user.role == UserRole.patient:
        patient = _get_patient_or_404(db, current_user.id)
        if appointment.patient_id != patient.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your appointment")
        if payload.status != AppointmentStatus.cancelled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Patients can only cancel appointments"
            )
    elif current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this appointment")

    allowed = ALLOWED_TRANSITIONS.get(appointment.status, set())
    if payload.status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition appointment from '{appointment.status.value}' to '{payload.status.value}'",
        )

    if payload.status in (AppointmentStatus.rejected, AppointmentStatus.cancelled):
        appointment.slot.is_booked = False

    if payload.meeting_url is not None:
        appointment.meeting_url = payload.meeting_url

    appointment.status = payload.status
    db.commit()
    db.refresh(appointment)
    return _to_response(appointment)


@router.post(
    "/{appointment_id}/messages", response_model=ConsultationMessageResponse, status_code=status.HTTP_201_CREATED
)
def send_message(
    appointment_id: int,
    payload: ConsultationMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appointment = _get_appointment_or_404(db, appointment_id)

    if current_user.role == UserRole.patient:
        patient = _get_patient_or_404(db, current_user.id)
        if appointment.patient_id != patient.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your appointment")
    elif current_user.role == UserRole.doctor:
        doctor = _get_doctor_or_404(db, current_user.id)
        if appointment.doctor_id != doctor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your appointment")
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only the patient or doctor on this appointment can send messages"
        )

    if appointment.status != AppointmentStatus.confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Messages can only be sent for confirmed appointments"
        )

    message = ConsultationMessage(appointment_id=appointment.id, sender_user_id=current_user.id, body=payload.body)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get("/{appointment_id}/messages", response_model=list[ConsultationMessageResponse])
def list_messages(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appointment = _get_appointment_or_404(db, appointment_id)

    if current_user.role == UserRole.admin:
        pass
    elif current_user.role == UserRole.patient:
        patient = _get_patient_or_404(db, current_user.id)
        if appointment.patient_id != patient.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your appointment")
    elif current_user.role == UserRole.doctor:
        doctor = _get_doctor_or_404(db, current_user.id)
        if appointment.doctor_id != doctor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your appointment")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view these messages")

    return appointment.messages


@router.post("/{appointment_id}/prescription", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED)
def issue_prescription(
    appointment_id: int,
    payload: PrescriptionCreate,
    current_user: User = Depends(require_role(UserRole.doctor)),
    db: Session = Depends(get_db),
):
    doctor = _get_doctor_or_404(db, current_user.id)
    appointment = _get_appointment_or_404(db, appointment_id)
    if appointment.doctor_id != doctor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your appointment")
    if appointment.status not in (AppointmentStatus.confirmed, AppointmentStatus.completed):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prescriptions can only be issued for confirmed or completed appointments",
        )

    prescription = Prescription(
        patient_id=appointment.patient_id,
        file_url=payload.file_url,
        notes=payload.notes,
        appointment_id=appointment.id,
        issued_by_doctor_id=doctor.id,
    )
    db.add(prescription)
    db.commit()
    db.refresh(prescription)
    return prescription
