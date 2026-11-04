
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

async function assertShopAccess(shopId: string, userId: string) {
  return prisma.shopMember.findFirst({
    where: { shopId, userId }
  });
}

const creditSchema = z.object({
  customerId: z.string().uuid(),
  description: z.string().max(500).optional(),
  totalAmount: z.coerce.number().positive().finite(),
  installmentCount: z.coerce.number().int().min(1).max(120),
  firstDueDate: z.string().min(1).refine(
    value => !Number.isNaN(new Date(value).getTime()),
    'Invalid first due date'
  ),
  intervalDays: z.coerce.number().int().min(1).max(365)
}).strict();

// Create new baki with installment schedule
router.post('/:shopId', async (req, res, next) => {
  try {
    const { shopId } = req.params;

    const member = await assertShopAccess(shopId, req.user!.id);

    if (!member) {
      return res.status(403).json({ message: 'Shop access denied' });
    }

    const body = creditSchema.parse(req.body);

    const customer = await prisma.customer.findFirst({
      where: {
        id: body.customerId,
        shopId
      }
    });

    if (!customer) {
      return res.status(404).json({
        message: 'Customer not found in this shop'
      });
    }

    const totalCents = Math.round(body.totalAmount * 100);

    if (!Number.isSafeInteger(totalCents) || totalCents < body.installmentCount) {
      return res.status(400).json({
        message: 'Amount is too small or invalid for the installment count'
      });
    }

    const baseCents = Math.floor(totalCents / body.installmentCount);
    const extraCents = totalCents % body.installmentCount;

    const firstDueDate = new Date(body.firstDueDate);

    const installments = Array.from(
      { length: body.installmentCount },
      (_, index) => {
        const dueDate = new Date(firstDueDate);

        dueDate.setDate(
          dueDate.getDate() + index * body.intervalDays
        );

        const amountCents =
          baseCents + (index < extraCents ? 1 : 0);

        return {
          amount: amountCents / 100,
          dueDate
        };
      }
    );

    const credit = await prisma.creditAccount.create({
      data: {
        shopId,
        customerId: body.customerId,
        description: body.description || null,
        totalAmount: totalCents / 100,
        installments: {
          create: installments
        }
      },
      include: {
        customer: true,
        installments: {
          orderBy: { dueDate: 'asc' }
        },
        payments: true
      }
    });

    return res.status(201).json({
      credit,
      message: 'Baki entry created successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Get all baki entries
router.get('/:shopId', async (req, res, next) => {
  try {
    const { shopId } = req.params;

    const member = await assertShopAccess(shopId, req.user!.id);

    if (!member) {
      return res.status(403).json({
        message: 'Shop access denied'
      });
    }

    const credits = await prisma.creditAccount.findMany({
      where: { shopId },
      include: {
        customer: true,
        installments: {
          orderBy: { dueDate: 'asc' }
        },
        payments: {
          where: { status: 'PAID' },
          orderBy: { createdAt: 'desc' },
          include: {
            allocations: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const result = credits.map(credit => {
      const totalCredit = Number(credit.totalAmount);

      const totalPaid = credit.payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      );

      const totalDue = credit.installments.reduce(
        (sum, installment) =>
          sum + Math.max(
            0,
            Number(installment.amount) -
            Number(installment.paidAmount)
          ),
        0
      );

      return {
        ...credit,
        totalCredit,
        totalPaid,
        totalDue
      };
    });

    return res.json({ credits: result });

  } catch (error) {
    next(error);
  }
});

export default router;
