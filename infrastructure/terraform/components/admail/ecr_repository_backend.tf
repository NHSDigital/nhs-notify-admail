resource "aws_ecr_repository" "backend" {
  name                 = "${local.csi}-backend"
  image_tag_mutability = "MUTABLE"
}
