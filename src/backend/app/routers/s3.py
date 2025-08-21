from fastapi import APIRouter, HTTPException
from app.services.s3_service import fetch_s3_file_history, get_s3_file_content

router = APIRouter()


@router.get("/s3/history")
async def get_s3_file_history():
    try:
        return await fetch_s3_file_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/s3/download")
async def download_s3_file(file_name: str):
    try:
        file_content = await get_s3_file_content(file_name)
        return file_content
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
