from datetime import datetime, timezone
from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

DataT = TypeVar("DataT")


class ResponseMeta(BaseModel):
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    request_id: Optional[str] = None


class ErrorPayload(BaseModel):
    code: str
    message: str
    details: List[Any] = Field(default_factory=list)


class StandardResponse(BaseModel, Generic[DataT]):
    """Unified API response envelope across every endpoint in the application."""
    success: bool = True
    data: Optional[DataT] = None
    error: Optional[ErrorPayload] = None
    meta: ResponseMeta = Field(default_factory=ResponseMeta)

    @classmethod
    def ok(cls, data: DataT, request_id: Optional[str] = None) -> "StandardResponse[DataT]":
        return cls(
            success=True,
            data=data,
            error=None,
            meta=ResponseMeta(request_id=request_id),
        )

    @classmethod
    def fail(
        cls,
        code: str,
        message: str,
        details: Optional[List[Any]] = None,
        request_id: Optional[str] = None,
    ) -> "StandardResponse[None]":
        return cls(
            success=False,
            data=None,
            error=ErrorPayload(code=code, message=message, details=details or []),
            meta=ResponseMeta(request_id=request_id),
        )


class PaginatedData(BaseModel, Generic[DataT]):
    items: List[DataT]
    total: int
    page: int
    page_size: int
    total_pages: int
