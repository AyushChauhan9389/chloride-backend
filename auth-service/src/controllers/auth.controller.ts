import { Request, Response } from 'express';
import { db } from '../db';
import { users, plans } from '../db/schema';
import { generateUserToken, hashPassword, comparePassword, getUserByEmail } from '../services/auth.service';
import { initializeDefaultRoles, getRoleByName } from '../services/role.service';
import { eq } from 'drizzle-orm';
import { ROLE_NAMES } from '@chloride/shared';
import { KafkaClient, KafkaTopics, UserCreatedEvent } from '@chloride/shared';

const kafkaClient = new KafkaClient('auth-service');

export const signup = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await hashPassword(password);

    // Initialize default roles if they don't exist
    await initializeDefaultRoles();

    // Get default plan
    let defaultPlan = await db.query.plans.findFirst({
      where: eq(plans.name, 'Free'),
    });

    if (!defaultPlan) {
      return res.status(500).json({ message: 'Default plan not found. Please contact administrator.' });
    }

    // Get default user role
    const defaultRole = await getRoleByName(ROLE_NAMES.USER);

    if (!defaultRole) {
      return res.status(500).json({ message: 'Default user role not found' });
    }

    const newUser = {
      email,
      password: hashedPassword,
      roleId: defaultRole.id,
      planId: defaultPlan.id,
      storageUsed: 0,
      storageLeft: defaultPlan.storageLimit,
    };

    const savedUser = await db.insert(users).values(newUser).returning();

    // Publish user created event to Kafka
    try {
      await kafkaClient.connectProducer();
      const event: UserCreatedEvent = {
        userId: savedUser[0].id,
        email: savedUser[0].email,
        roleId: defaultRole.id,
        planId: defaultPlan.id,
        timestamp: new Date().toISOString(),
      };
      await kafkaClient.sendMessage(KafkaTopics.USER_CREATED, `user-${savedUser[0].id}`, event);
    } catch (kafkaError) {
      console.error('Failed to publish user created event:', kafkaError);
      // Don't fail the request if Kafka fails
    }

    const token = await generateUserToken(savedUser[0].id);

    res.status(201).json({
      token,
      user: {
        id: savedUser[0].id,
        email: savedUser[0].email,
        role: defaultRole.name,
        plan: defaultPlan.name,
        storageLimit: defaultPlan.storageLimit,
      }
    });
    return;
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = await generateUserToken(user.id);

    res.status(200).json({ 
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role?.name,
        plan: user.plan?.name,
      }
    });
    return;
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

export const verifyToken = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const { verifyToken: verify } = await import('../services/auth.service');
    const decoded = verify(token);

    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    res.status(200).json({ valid: true, user: decoded });
    return;
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

