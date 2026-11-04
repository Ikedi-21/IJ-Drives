from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import init_db
from app.core.middleware import RequestContextMiddleware, register_exception_handlers
from app.data_seeds.seed_initial_data import run_seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed initial data if empty
    await init_db()
    try:
        await run_seed()
    except Exception as exc:
        print(f"[Lifespan] Note on seeder: {exc}")
    yield
    # Shutdown logic (if any)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production FastAPI backend for IJDrives — Nigerian Multi-Modal Transport Marketplace",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# 1. Register global exception handlers for unified response envelopes
register_exception_handlers(app)

# 2. Add custom RequestContextMiddleware (Request ID + latency timing)
app.add_middleware(RequestContextMiddleware)

# 3. Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Include Versioned API Routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", include_in_schema=False)
async def root():
    """Redirect root directly to interactive Swagger API documentation."""
    return RedirectResponse(url="/docs")

