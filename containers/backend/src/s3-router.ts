import { type Request, type Response, Router } from "express";

import { fetchS3FileHistory, getS3FileContent } from "src/s3-service";

const router = Router();

router.get("/history", async (_req: Request, res: Response) => {
  try {
    const files = await fetchS3FileHistory();
    res.json(files);
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Internal server error";
    res.status(500).json({ detail });
  }
});

router.get("/download", async (req: Request, res: Response) => {
  const fileName = req.query.file_name;

  if (!fileName || typeof fileName !== "string") {
    res.status(400).json({ detail: "file_name query parameter is required" });
    return;
  }

  try {
    const content = await getS3FileContent(fileName);
    res.json(content);
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Internal server error";
    res.status(500).json({ detail });
  }
});

export default router;
