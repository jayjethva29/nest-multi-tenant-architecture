import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetBucketAclCommand,
  GetObjectAclCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AwsS3FileService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get('AWS_S3_BUCKET');

    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async uploadFile(
    dataBuffer: Buffer,
    folder: string,
    filename: string,
    isFilePublic = false,
    autogeneratePrefix = false,
    options = {},
  ) {
    const key = autogeneratePrefix ? `${folder}/${uuid()}-${filename}` : `${folder}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: dataBuffer,
      ACL: isFilePublic ? 'public-read' : undefined,
      ...options,
    });

    await this.s3Client.send(command);

    return {
      key,
      url: `https://${this.bucketName}.s3.${this.configService.get(
        'AWS_REGION',
      )}.amazonaws.com/${key}`,
    };
  }

  async getFile(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const result = await this.s3Client.send(command);
    return { Body: await this.streamToBuffer(result.Body) };
  }

  async streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err) => reject(err));
    });
  }

  async getSignedDownloadUrl(key: string, expires = 900) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expires,
    });
    return signedUrl;
  }

  async getSignedUploadUrl(
    folder: string,
    filename: string,
    contentType: string,
    expires = 900,
    autogeneratePrefix = false,
  ) {
    const key = autogeneratePrefix ? `${folder}/${uuid()}-${filename}` : `${folder}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expires,
    });

    return {
      uploadUrl: signedUrl,
      key: key,
      publicUrl: `https://${this.bucketName}.s3.${this.configService.get(
        'AWS_REGION',
      )}.amazonaws.com/${key}`,
    };
  }

  async deleteFile(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const result = await this.s3Client.send(command);
    return result;
  }

  async getBucketAcl(accountId: string) {
    const command = new GetBucketAclCommand({
      Bucket: this.bucketName,
      ExpectedBucketOwner: accountId,
    });

    const result = await this.s3Client.send(command);
    return result;
  }

  async getObjectAcl(key: string) {
    const command = new GetObjectAclCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const result = await this.s3Client.send(command);
    return result;
  }

  async getBucketList() {
    const command = new ListBucketsCommand({});
    const result = await this.s3Client.send(command);
    return result;
  }

  async getObjectList(maxKeys = 2) {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      MaxKeys: maxKeys,
    });

    const result = await this.s3Client.send(command);
    return result;
  }
}
