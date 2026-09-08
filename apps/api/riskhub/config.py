from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    app_name: str = "RiskHub"
    environment: str = "development"
    database_url: str = f"sqlite:///{BASE_DIR / 'riskhub.db'}"
    jwt_secret: str = "development-only-change-me-before-prod"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    storage_dir: Path = BASE_DIR / "storage"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"
    feishu_app_id: str = ""
    feishu_app_secret: str = ""
    feishu_department_id: str = ""
    feishu_department_name: str = "SRE"
    feishu_risk_base_url: str = ""

    model_config = SettingsConfigDict(env_prefix="RISKHUB_", env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def feishu_configured(self) -> bool:
        return bool(self.feishu_app_id and self.feishu_app_secret and self.feishu_department_id)


settings = Settings()
