from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from app.services.convert_service import convert_file_service
from app.core import constants

router = APIRouter()


@router.post("/convert")
async def convert_file_endpoint(request: Request, file: UploadFile = File(None)):
    if not file:
        raise HTTPException(status_code=400, detail=constants.ERROR_NO_FILE_PROVIDED)
    return await convert_file_service(file)
