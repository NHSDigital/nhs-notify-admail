output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets (for the Application Load Balancer)"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets (for ECS Fargate tasks)"
  value       = aws_subnet.private[*].id
}

output "vpc_endpoint_security_group_id" {
  description = "ID of the security group attached to all interface VPC endpoints"
  value       = aws_security_group.vpc_endpoints.id
}

output "s3_prefix_list_id" {
  description = "ID of the AWS-managed prefix list for S3 in the configured region (use in egress rules targeting the S3 gateway endpoint)"
  value       = aws_vpc_endpoint.s3.prefix_list_id
}
