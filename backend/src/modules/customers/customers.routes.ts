
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Check shop access
async function assertShopAccess(shopId: string, userId: string) {
  return prisma.shopMember.findFirst({
    where: { shopId, userId }
  });
}

// Get all customers
router.get('/:shopId', async (req, res, next) => {
  try {
    const { shopId } = req.params;

    const member = await assertShopAccess(shopId, req.user!.id);

    if (!member) {
      return res.status(403).json({
        message: 'Shop access denied'
      });
    }

    const customers = await prisma.customer.findMany({
      where: { shopId },
      orderBy: { name: 'asc' }
    });

    res.json({ customers });
  } catch (e) {
    next(e);
  }
});

// Add new customer
router.post('/:shopId', async (req, res, next) => {
  try {
    const { shopId } = req.params;

    const member = await assertShopAccess(shopId, req.user!.id);

    if (!member) {
      return res.status(403).json({
        message: 'Shop access denied'
      });
    }

    const body = z.object({
      name: z.string().min(2).max(100),
      phone: z.string().min(10).max(16),
      address: z.string().max(250).optional()
    }).strict().parse(req.body);

    const customer = await prisma.customer.create({
      data: {
        ...body,
        shopId
      }
    });

    res.status(201).json({
      customer,
      message: 'Customer added successfully'
    });
  } catch (e) {
    next(e);
  }
});

// Edit existing customer
router.patch('/:shopId/:customerId', async (req, res, next) => {
  try {
    const { shopId, customerId } = req.params;

    const member = await assertShopAccess(shopId, req.user!.id);

    if (!member) {
      return res.status(403).json({
        message: 'Shop access denied'
      });
    }

    const body = z.object({
      name: z.string().min(2).max(100).optional(),
      phone: z.string().min(10).max(16).optional(),
      address: z.string().max(250).optional()
    }).strict().refine(
      data => Object.keys(data).length > 0,
      { message: 'At least one field is required' }
    ).parse(req.body);

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        shopId
      }
    });

    if (!existingCustomer) {
      return res.status(404).json({
        message: 'Customer not found'
      });
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: body
    });

    res.json({
      customer,
      message: 'Customer updated successfully'
    });
  } catch (e) {
    next(e);
  }
});

export default router;
