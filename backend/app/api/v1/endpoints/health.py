from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.schemas.common import StandardResponse

router = APIRouter()


@router.get("", response_model=StandardResponse[dict])
async def health_check(session: AsyncSession = Depends(get_db)):
    """Health and readiness probe checking database connectivity."""
    db_status = "healthy"
    try:
        await session.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"unhealthy: {str(exc)}"

    return StandardResponse.ok({
        "status": "online" if "unhealthy" not in db_status else "degraded",
        "database": db_status,
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    })
