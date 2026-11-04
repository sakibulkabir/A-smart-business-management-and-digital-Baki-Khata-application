
import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Check shop access
async function checkShopAccess(shopId: string, userId: string) {
  return prisma.shopMember.findFirst({
    where: { shopId, userId }
  });
}

// Dashboard summary
router.get('/:shopId/summary', async (req, res, next) => {
  try {
    const { shopId } = req.params;

    const member = await checkShopAccess(shopId, req.user!.id);

    if (!member) {
      return res.status(403).json({ message: 'Shop access denied' });
    }

    const [customers, credits, installments, payments] =
      await Promise.all([
        prisma.customer.count({
          where: { shopId }
        }),

        prisma.creditAccount.findMany({
          where: { shopId }
        }),

        prisma.installment.findMany({
          where: {
            credit: { shopId }
          }
        }),

        prisma.payment.findMany({
          where: {
            credit: { shopId },
            status: 'PAID'
          }
        })
      ]);

    const totalCredit = credits.reduce(
      (sum, credit) => sum + Number(credit.totalAmount),
      0
    );

    const totalPaid = payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    const totalDue = installments.reduce(
      (sum, installment) =>
        sum + Math.max(
          0,
          Number(installment.amount) - Number(installment.paidAmount)
        ),
      0
    );

    res.json({
      summary: {
        customers,
        totalCredit,
        totalPaid,
        totalDue
      }
    });
  } catch (error) {
    next(error);
  }
});

// Customer-wise report
router.get('/:shopId/customers', async (req, res, next) => {
  try {
    const { shopId } = req.params;

    const member = await checkShopAccess(shopId, req.user!.id);

    if (!member) {
      return res.status(403).json({ message: 'Shop access denied' });
    }

    const customers = await prisma.customer.findMany({
      where: { shopId },
      include: {
        credits: {
          include: {
            installments: true,
            payments: {
              where: { status: 'PAID' }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const report = customers.map(customer => {
      const totalCredit = customer.credits.reduce(
        (sum, credit) => sum + Number(credit.totalAmount),
        0
      );

      const totalPaid = customer.credits.reduce(
        (sum, credit) =>
          sum +
          credit.payments.reduce(
            (paymentSum, payment) =>
              paymentSum + Number(payment.amount),
            0
          ),
        0
      );

      const totalDue = customer.credits.reduce(
        (sum, credit) =>
          sum +
          credit.installments.reduce(
            (installmentSum, installment) =>
              installmentSum +
              Math.max(
                0,
                Number(installment.amount) -
                  Number(installment.paidAmount)
              ),
            0
          ),
        0
      );

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        totalCredit,
        totalPaid,
        totalDue
      };
    });

    res.json({ customers: report });
  } catch (error) {
    next(error);
  }
});

// Recent payment history
router.get('/:shopId/recent-payments', async (req, res, next) => {
  try {
    const { shopId } = req.params;

    const member = await checkShopAccess(shopId, req.user!.id);

    if (!member) {
      return res.status(403).json({ message: 'Shop access denied' });
    }

    const payments = await prisma.payment.findMany({
      where: {
        credit: { shopId },
        status: 'PAID'
      },
      include: {
        credit: {
          include: {
            customer: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    res.json({
      payments: payments.map(payment => ({
        id: payment.id,
        amount: Number(payment.amount),
        method: payment.method,
        reference: payment.reference,
        receivedAt: payment.receivedAt,
        createdAt: payment.createdAt,
        customer: {
          id: payment.credit.customer.id,
          name: payment.credit.customer.name,
          phone: payment.credit.customer.phone
        },
        creditId: payment.creditId
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;
