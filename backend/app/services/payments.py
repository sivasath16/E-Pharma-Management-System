import uuid
from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol


@dataclass
class PaymentResult:
    success: bool
    reference: str


class PaymentProvider(Protocol):
    def charge(self, amount: Decimal, *, simulate_failure: bool = False) -> PaymentResult: ...


class MockPaymentProvider:
    """Simulates a payment gateway with no external account or API keys.

    Always succeeds unless the caller explicitly opts into `simulate_failure`
    (a mock-only testing hook) -- lets the failure path be tested deterministically.
    A real provider (Stripe, etc.) can be swapped in later behind the same
    `PaymentProvider` protocol without touching call sites.
    """

    def charge(self, amount: Decimal, *, simulate_failure: bool = False) -> PaymentResult:
        if simulate_failure:
            return PaymentResult(success=False, reference="")
        return PaymentResult(success=True, reference=f"mock_{uuid.uuid4().hex[:16]}")


def get_payment_provider() -> PaymentProvider:
    return MockPaymentProvider()
