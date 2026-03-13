resource "aws_ecr_repository" "frontend" {
  name                 = "${local.csi}-frontend"
  image_tag_mutability = "MUTABLE"
}
