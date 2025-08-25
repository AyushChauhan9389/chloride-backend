
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users, plans, roles } from '../db/schema';
import { generateUserToken } from '../services/auth.service';
import { NewUser } from '../types/user.types';
import { eq } from 'drizzle-orm';
import { getPlanById } from '../services/plan.service';
import { getRoleByName, initializeDefaultRoles } from '../services/role.service';
import { ROLE_NAMES } from '../types/user.types';

export const signup = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Initialize default roles if they don't exist
    await initializeDefaultRoles();

    // Get or create default plan
    let defaultPlan = await db.query.plans.findFirst({
      where: eq(plans.name, 'Free'),
    });

    if (!defaultPlan) {
      return res.status(500).json({ message: 'Default plan not found' });
    }

    if (!defaultPlan) {
      // Create default plan if it doesn't exist
      const createdPlan = await db.insert(plans).values({
        name: 'Free',
        fileLimit: 10,
        storageLimit: 100 * 1024 * 1024, // 100MB in bytes
      }).returning();

      defaultPlan = createdPlan[0];
    }

    // Get default user role
    const defaultRole = await db.query.roles.findFirst({
      where: eq(roles.name, ROLE_NAMES.USER),
    });

    if (!defaultRole) {
      return res.status(500).json({ message: 'Default user role not found' });
    }

    const newUser: NewUser = {
      email,
      password: hashedPassword,
      roleId: defaultRole.id,
      planId: defaultPlan?.id,
      storageUsed: 0,
      storageLeft: defaultPlan?.storageLimit,
    };

    const savedUser = await db.insert(users).values(newUser).returning();

    const token = await generateUserToken(savedUser[0]?.id!);

    res.status(201).json({
      token,
      user: {
        id: savedUser[0]?.id,
        email: savedUser[0]?.email,
        role: defaultRole?.name,
        plan: defaultPlan?.name,
        storageLimit: defaultPlan?.storageLimit,
      }
    });
    return;
  } catch (error) {
    console.error(error);
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
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = await generateUserToken(user.id);

    res.status(200).json({ token });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};
