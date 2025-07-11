resource "aws_ecr_repository" "notifai-frontend" {
  name                 = "${local.csi}-frontend"
  image_tag_mutability = "MUTABLE"
}

resource "aws_ecr_repository" "notifai-backend" {
  name                 = "${local.csi}-backend"
  image_tag_mutability = "MUTABLE"
}
