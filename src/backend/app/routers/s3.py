from fastapi import APIRouter, HTTPException
from app.services.s3_service import fetch_s3_file_history, generate_presigned_url

router = APIRouter()


@router.get("/s3/history")
async def get_s3_file_history(batch: int = 10, start_after: str = None):
    try:
        return await fetch_s3_file_history(batch, start_after)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/s3/download/{file_name}")
async def download_s3_file(file_name: str):
    try:
        return {"download_url": await generate_presigned_url(file_name)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
