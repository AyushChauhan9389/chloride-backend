import { S3Client } from "bun";
import * as dotenv from 'dotenv';
import { v4 as uuid } from "uuid";

dotenv.config();
const client = new S3Client({
    bucket: "chloride-cli",
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.ACCESS_SECRET,
    region: "ap-south-1"
})

