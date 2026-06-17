import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    const existingCategories = await db.serviceCategory.count();
    if (existingCategories > 0) {
      return NextResponse.json(
        { message: 'Categories already exist', skipped: true },
        { status: 200 }
      );
    }

    // Only create service categories - no demo users, no admin, no providers
    const categories = await Promise.all([
      db.serviceCategory.create({
        data: { name: 'Home Services', icon: 'home', description: 'Professional home maintenance and repair services', order: 1 },
      }),
      db.serviceCategory.create({
        data: { name: 'Education', icon: 'graduation-cap', description: 'Tutoring and training services', order: 2 },
      }),
      db.serviceCategory.create({
        data: { name: 'Transport', icon: 'car', description: 'Driving and vehicle services', order: 3 },
      }),
      db.serviceCategory.create({
        data: { name: 'Events', icon: 'camera', description: 'Photography, decoration, and event planning', order: 4 },
      }),
      db.serviceCategory.create({
        data: { name: 'Beauty', icon: 'sparkles', description: 'Makeup and beauty services', order: 5 },
      }),
      db.serviceCategory.create({
        data: { name: 'Repairs', icon: 'wrench', description: 'Mobile, computer, and electronics repair', order: 6 },
      }),
    ]);

    return NextResponse.json({
      message: 'Categories seeded successfully',
      data: { categories: categories.length },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed categories' },
      { status: 500 }
    );
  }
}
