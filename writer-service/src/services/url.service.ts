import { db } from '../db';
import { shortenedUrls } from '../db/schema';
import { nanoid } from 'nanoid';
import { KafkaClient, KafkaTopics, UrlShortenedEvent } from '@chloride/shared';

const kafkaClient = new KafkaClient('writer-service-url');

export const shortenUrl = async (originalUrl: string): Promise<string> => {
  const shortCode = nanoid(8);
  
  await db.insert(shortenedUrls).values({
    originalUrl,
    shortCode,
  });

  // Publish URL shortened event
  try {
    await kafkaClient.connectProducer();
    const event: UrlShortenedEvent = {
      shortCode,
      originalUrl,
      timestamp: new Date().toISOString(),
    };
    await kafkaClient.sendMessage(KafkaTopics.URL_SHORTENED, shortCode, event);
  } catch (error) {
    console.error('Failed to publish URL shortened event:', error);
  }

  return shortCode;
};

