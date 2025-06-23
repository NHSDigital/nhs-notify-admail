resource "aws_ecr_repository" "notifai-frontend" {
  name                 = "frontend-${local.resource-suffix}"
  image_tag_mutability = "MUTABLE"
}

resource "aws_ecr_repository" "notifai-backend" {
  name                 = "backend-${local.resource-suffix}"
  image_tag_mutability = "MUTABLE"
}
