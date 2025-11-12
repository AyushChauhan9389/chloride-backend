import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';

export class KafkaClient {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private isProducerConnected = false;
  private isConsumerConnected = false;

  constructor(
    private clientId: string,
    private brokers: string[] = ['kafka:9092']
  ) {
    this.kafka = new Kafka({
      clientId: this.clientId,
      brokers: this.brokers,
    });
  }

  // Producer methods
  async connectProducer(): Promise<void> {
    if (!this.producer) {
      this.producer = this.kafka.producer();
    }
    if (!this.isProducerConnected) {
      await this.producer.connect();
      this.isProducerConnected = true;
      console.log(`[${this.clientId}] Kafka producer connected`);
    }
  }

  async sendMessage(topic: string, key: string, value: any): Promise<void> {
    if (!this.isProducerConnected) {
      await this.connectProducer();
    }

    try {
      await this.producer!.send({
        topic,
        messages: [
          {
            key,
            value: JSON.stringify(value),
            timestamp: Date.now().toString(),
          },
        ],
      });
      console.log(`[${this.clientId}] Message sent to topic: ${topic}`);
    } catch (error) {
      console.error(`[${this.clientId}] Error sending message:`, error);
      throw error;
    }
  }

  async disconnectProducer(): Promise<void> {
    if (this.producer && this.isProducerConnected) {
      await this.producer.disconnect();
      this.isProducerConnected = false;
      console.log(`[${this.clientId}] Kafka producer disconnected`);
    }
  }

  // Consumer methods
  async connectConsumer(groupId: string): Promise<void> {
    if (!this.consumer) {
      this.consumer = this.kafka.consumer({ groupId });
    }
    if (!this.isConsumerConnected) {
      await this.consumer.connect();
      this.isConsumerConnected = true;
      console.log(`[${this.clientId}] Kafka consumer connected (group: ${groupId})`);
    }
  }

  async subscribe(topics: string[]): Promise<void> {
    if (!this.isConsumerConnected || !this.consumer) {
      throw new Error('Consumer not connected. Call connectConsumer first.');
    }

    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
      console.log(`[${this.clientId}] Subscribed to topic: ${topic}`);
    }
  }

  async consume(
    handler: (payload: EachMessagePayload) => Promise<void>
  ): Promise<void> {
    if (!this.isConsumerConnected || !this.consumer) {
      throw new Error('Consumer not connected. Call connectConsumer first.');
    }

    await this.consumer.run({
      eachMessage: async (payload) => {
        try {
          console.log(`[${this.clientId}] Received message from topic: ${payload.topic}`);
          await handler(payload);
        } catch (error) {
          console.error(`[${this.clientId}] Error processing message:`, error);
        }
      },
    });
  }

  async disconnectConsumer(): Promise<void> {
    if (this.consumer && this.isConsumerConnected) {
      await this.consumer.disconnect();
      this.isConsumerConnected = false;
      console.log(`[${this.clientId}] Kafka consumer disconnected`);
    }
  }

  // Graceful shutdown
  async disconnect(): Promise<void> {
    await this.disconnectProducer();
    await this.disconnectConsumer();
  }
}

