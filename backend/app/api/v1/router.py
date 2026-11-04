from fastapi import APIRouter

from app.api.v1.endpoints import auth, bookings, health, transport, wallet

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health & Diagnostics"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Identity"])
api_router.include_router(wallet.router, prefix="/wallet", tags=["Wallet & Accounting"])
api_router.include_router(transport.router, prefix="/transport", tags=["Transport Discovery & Catalog"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings & Tickets"])

