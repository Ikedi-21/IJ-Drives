from typing import Any, Dict, List, Optional


class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = 500,
        details: Optional[List[Dict[str, Any]]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or []


class EntityNotFoundException(AppException):
    def __init__(self, entity_name: str, identifier: Any):
        super().__init__(
            message=f"{entity_name} with identifier '{identifier}' was not found.",
            code="RESOURCE_NOT_FOUND",
            status_code=404,
        )


class DuplicateResourceException(AppException):
    def __init__(self, resource: str, field: str, value: Any):
        super().__init__(
            message=f"{resource} with {field} '{value}' already exists.",
            code="DUPLICATE_RESOURCE",
            status_code=409,
        )


class AuthenticationException(AppException):
    def __init__(self, message: str = "Invalid email or password."):
        super().__init__(
            message=message,
            code="AUTHENTICATION_FAILED",
            status_code=401,
        )


class ForbiddenException(AppException):
    def __init__(self, message: str = "You do not have permission to perform this action."):
        super().__init__(
            message=message,
            code="FORBIDDEN_ACTION",
            status_code=403,
        )


class InsufficientWalletBalanceException(AppException):
    def __init__(self, current_balance: float, required_amount: float):
        super().__init__(
            message=(
                f"Insufficient wallet balance. You have ₦{current_balance:,.2f} "
                f"but require ₦{required_amount:,.2f}."
            ),
            code="INSUFFICIENT_WALLET_BALANCE",
            status_code=400,
            details=[
                {
                    "current_balance": current_balance,
                    "required_amount": required_amount,
                    "shortfall": required_amount - current_balance,
                }
            ],
        )


class SeatUnavailableException(AppException):
    def __init__(self, message: str = "The selected seat or route has no remaining capacity."):
        super().__init__(
            message=message,
            code="SEAT_UNAVAILABLE",
            status_code=409,
        )


class BusinessRuleViolationException(AppException):
    def __init__(self, message: str, code: str = "BUSINESS_RULE_VIOLATION"):
        super().__init__(
            message=message,
            code=code,
            status_code=400,
        )
