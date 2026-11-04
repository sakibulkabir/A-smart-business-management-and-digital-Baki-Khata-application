import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/', async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(2).max(120),
      slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(60)
    }).parse(req.body);
    const shop = await prisma.shop.create({
      data: {
        name: body.name, slug: body.slug, ownerId: req.user!.id,
        members: { create: { userId: req.user!.id, role: 'OWNER' } }
      }
    });
    res.status(201).json({ shop });
  } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const shops = await prisma.shop.findMany({
      where: { members: { some: { userId: req.user!.id } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ shops });
  } catch (e) { next(e); }
});
export default router;
