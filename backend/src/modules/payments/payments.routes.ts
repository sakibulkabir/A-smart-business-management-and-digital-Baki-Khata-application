
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Receive cash payment and allocate it to oldest installments first
router.post('/cash', async (req, res, next) => {
  try {
    const body = z.object({
      creditId: z.string().uuid(),
      amount: z.coerce.number().positive().finite(),
      reference: z.string().max(150).optional()
    }).strict().parse(req.body);

    const credit = await prisma.creditAccount.findUnique({
      where: { id: body.creditId },
      include: {
        installments: {
          orderBy: [
            { dueDate: 'asc' },
            { createdAt: 'asc' }
          ]
        }
      }
    });

    if (!credit) {
      return res.status(404).json({
        message: 'Baki entry not found'
      });
    }

    const member = await prisma.shopMember.findFirst({
      where: {
        shopId: credit.shopId,
        userId: req.user!.id
      }
    });

    if (!member) {
      return res.status(403).json({
        message: 'Shop access denied'
      });
    }

    const paymentCents = Math.round(body.amount * 100);

    if (paymentCents <= 0) {
      return res.status(400).json({
        message: 'Invalid payment amount'
      });
    }

    const result = await prisma.$transaction(
      async tx => {
        // Read installments again inside the transaction
        const installments = await tx.installment.findMany({
          where: { creditId: body.creditId },
          orderBy: [
            { dueDate: 'asc' },
            { createdAt: 'asc' }
          ]
        });

        const outstandingCents = installments.reduce(
          (sum, installment) => {
            const due = Math.max(
              0,
              Math.round(
                (Number(installment.amount) -
                  Number(installment.paidAmount)) * 100
              )
            );

            return sum + due;
          },
          0
        );

        if (paymentCents > outstandingCents) {
          throw new Error(
            `Payment exceeds outstanding balance. Current due: ${(outstandingCents / 100).toFixed(2)}`
          );
        }

        const payment = await tx.payment.create({
          data: {
            creditId: body.creditId,
            amount: paymentCents / 100,
            method: 'CASH',
            status: 'PAID',
            reference: body.reference || null,
            receivedAt: new Date()
          }
        });

        let remainingCents = paymentCents;

        for (const installment of installments) {
          if (remainingCents <= 0) break;

          const installmentAmountCents = Math.round(
            Number(installment.amount) * 100
          );

          const alreadyPaidCents = Math.round(
            Number(installment.paidAmount) * 100
          );

          const dueCents = Math.max(
            0,
            installmentAmountCents - alreadyPaidCents
          );

          if (dueCents <= 0) continue;

          const allocatedCents = Math.min(
            remainingCents,
            dueCents
          );

          const newPaidCents =
            alreadyPaidCents + allocatedCents;

          let status: 'UPCOMING' | 'PARTIAL' | 'PAID';

          if (newPaidCents >= installmentAmountCents) {
            status = 'PAID';
          } else if (newPaidCents > 0) {
            status = 'PARTIAL';
          } else {
            status = 'UPCOMING';
          }

          await tx.installment.update({
            where: { id: installment.id },
            data: {
              paidAmount: newPaidCents / 100,
              status
            }
          });

          await tx.paymentAllocation.create({
            data: {
              paymentId: payment.id,
              installmentId: installment.id,
              amount: allocatedCents / 100
            }
          });

          remainingCents -= allocatedCents;
        }

        return tx.payment.findUnique({
          where: { id: payment.id },
          include: {
            allocations: {
              include: {
                installment: true
              }
            },
            credit: {
              include: {
                customer: true
              }
            }
          }
        });
      },
      {
        isolationLevel: 'Serializable'
      }
    );

    res.status(201).json({
      payment: result,
      message: 'Payment received successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get payment history for one baki entry
router.get('/credit/:creditId', async (req, res, next) => {
  try {
    const { creditId } = req.params;

    const credit = await prisma.creditAccount.findUnique({
      where: { id: creditId }
    });

    if (!credit) {
      return res.status(404).json({
        message: 'Baki entry not found'
      });
    }

    const member = await prisma.shopMember.findFirst({
      where: {
        shopId: credit.shopId,
        userId: req.user!.id
      }
    });

    if (!member) {
      return res.status(403).json({
        message: 'Shop access denied'
      });
    }

    const payments = await prisma.payment.findMany({
      where: {
        creditId,
        status: 'PAID'
      },
      include: {
        allocations: {
          include: {
            installment: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ payments });
  } catch (error) {
    next(error);
  }
});

export default router;
