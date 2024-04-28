import { nestedMapReplacer, nestedMapReviver } from '../../utils/json';

export type ExpenseId = number;

export type CreditorId = string;

export type DebtorId = string;

interface DebtTransaction {
  expenseId: ExpenseId;
  grants: number;
  amount: number;
}

export interface Debt {
  expenseId: ExpenseId;
  history: DebtTransaction[];
}

export interface Debtor {
  owes: number;
  debts: Debt[];
}

export type DebtorsMap = Map<DebtorId, Debtor>;

export type CreditorsMap = Map<CreditorId, DebtorsMap>;

export class DebtSimplifier {
  private creditors: CreditorsMap = new Map();

  constructor() {}

  toJSON() {
    return JSON.stringify(this.creditors, nestedMapReplacer);
  }

  fromJSON(json: string) {
    this.creditors = JSON.parse(json, nestedMapReviver);
  }

  getCreditors() {
    return this.creditors;
  }

  add(
    creditorId: CreditorId,
    debtorId: DebtorId,
    debtorOwes: number,
    expenseId: ExpenseId,
  ) {
    this.ensureTwoWayRelation(creditorId, debtorId);

    this.upsertDebtTransaction(
      creditorId,
      debtorId,
      expenseId,
      expenseId,
      debtorOwes,
    );

    this.simplify(creditorId, debtorId);
  }

  /**
   * # Algorithm:
   *
   * __START__
   * 1. Try to simplify debt of `B`. In the relation `A->B`:
   *    Take the most expensive debt in the history with amount `X`, where `X > 0`.
   *    In the relation `B->A`, take the first debt with expense id of `expenseId_A`,
   *    and amount `Y`, where `Y > 0`, such that `X = Y + p`, where `p` is minimal (closest to 0).
   * 2. Calculate new amount `newY`, where `newY = max(Y - X, 0)`.
   * 3. Calculate new amount newX, where `newX = X - (Y - Ynew)`.
   * 4. Calculate `grants` amount, where `grants = -1 * (X - newX)`.
   * 5. Add the new amount `newX` to the history of `expenseId_B`.
   *    In the relation `A->B`, push `{ expense: expenseId_A, grants: grants, amount: amount + grants }`.
   *    Update `B`'s owes to be `owes = owes + grants`.
   * 6. Add the new amount `newY` to the history of expenseId_A.
   *    In the relation `B->A`, push `{ expense: expenseId_B, grants: grants, amount: amount + grants }`.
   *    Update `A`'s owes to be `owes = owes + grants`.
   * 7. If `newX > 0`, repeat from (1)
   *
   * __END__
   */
  private simplify(creditorId: CreditorId, debtorId: DebtorId) {
    const A = this.getDebtor(creditorId, debtorId);
    const B = this.getDebtor(debtorId, creditorId);

    if (!A || !B) {
      throw new Error(
        `Expected required creditorId and debtorId, but got (${A}, ${B}).`,
      );
    }

    this.sortDebtsAscending(creditorId, debtorId);

    // Always take the most expensive debt
    const debtA = A.debts.at(-1);
    if (!debtA) {
      return;
    }

    let X = this.getDebtAmount(debtA);
    const debtBRightmostIndexForX = this.findRightmostIndex(
      X,
      B.debts,
      this.getDebtAmount,
    );
    let debtBIndex = debtBRightmostIndexForX;
    let debtBIndexPrefixSum = B.debts
      .slice(0, debtBIndex + 1)
      .reduce((sum, debt) => sum + this.getDebtAmount(debt), 0);

    while (X > 0) {
      if (debtBIndex < 0) {
        break;
      }

      const debtB = B.debts[debtBIndex];
      const Y = this.getDebtAmount(debtB);
      if (Y <= 0) {
        break;
      }

      debtBIndexPrefixSum -= Y;

      const newY = Math.max(Y - X, 0);
      const newX = X - (Y - newY);
      const grants = -1 * (X - newX);

      A.owes += grants;
      debtA.history.push({
        expenseId: debtB.expenseId,
        grants,
        amount: X + grants,
      });

      B.owes += grants;
      debtB.history.push({
        expenseId: debtA.expenseId,
        grants,
        amount: Y + grants,
      });

      X = newX;

      // Cover as much small expenses as possible. Otherwise, add to the next closest expense.
      if (debtBIndexPrefixSum > 0) {
        debtBIndex--;
      } else {
        debtBIndex = Math.min(debtBRightmostIndexForX + 1, B.debts.length - 1);
      }
    }
  }

  private upsertDebtTransaction(
    creditorId: CreditorId,
    debtorId: DebtorId,
    fromExpenseId: ExpenseId,
    toExpenseId: ExpenseId,
    grants: number,
  ) {
    const debtor = this.getDebtor(creditorId, debtorId);
    if (!debtor) {
      throw new Error(`Debtor ${debtorId} has not been created`);
    }

    const getOrCreateDebt = () => {
      const debt = debtor.debts.find(
        (element) => element.expenseId === toExpenseId,
      );

      if (!debt) {
        debtor.debts.push({ expenseId: toExpenseId, history: [] });
        return debtor.debts.at(-1);
      }

      return debt;
    };

    const debt = getOrCreateDebt();
    if (!debt) {
      throw new Error(`Debt for expense ${toExpenseId} has not been created.`);
    }

    const previousHistoryEntry = debt.history.at(-1);
    if (previousHistoryEntry) {
      debt.history.push({
        expenseId: fromExpenseId,
        grants,
        amount: previousHistoryEntry.amount + grants,
      });
    } else {
      debt.history.push({
        expenseId: fromExpenseId,
        grants,
        amount: grants,
      });
    }

    debtor.owes += grants;
  }

  private ensureTwoWayRelation(creditorId: CreditorId, debtorId: DebtorId) {
    this.ensureDebtor(creditorId, debtorId);
    this.ensureDebtor(debtorId, creditorId);
  }

  private ensureDebtor(creditorId: CreditorId, debtorId: DebtorId) {
    if (!this.hasCreditor(creditorId)) {
      this.initializeEmptyCreditor(creditorId);
    }
    if (!this.hasDebtor(creditorId, debtorId)) {
      this.initializeEmptyDebtor(creditorId, debtorId);
    }
  }

  private initializeEmptyCreditor(creditorId: CreditorId) {
    this.creditors.set(creditorId, new Map());
  }

  private initializeEmptyDebtor(creditorId: CreditorId, debtorId: DebtorId) {
    if (!this.creditors.has(creditorId)) {
      this.initializeEmptyCreditor(creditorId);
    }
    const creditor = this.creditors.get(creditorId);

    if (!creditor) {
      throw new Error(`Creditor ${creditorId} has not been created.`);
    }

    creditor.set(debtorId, { owes: 0, debts: [] });
  }

  private sortDebtsAscending(creditorId: CreditorId, debtorId: DebtorId) {
    this.getDebtor(creditorId, debtorId)?.debts.sort((a, b) => {
      const amountA = this.getDebtAmount(a);
      const amountB = this.getDebtAmount(b);

      return amountA <= amountB ? -1 : 1;
    });
  }

  private hasCreditor(creditorId: CreditorId) {
    return this.creditors.has(creditorId);
  }

  private getDebtAmount(debt: Debt) {
    return debt.history.at(-1)?.amount ?? 0;
  }

  private getDebtor(creditorId: CreditorId, debtorId: DebtorId) {
    const creditor = this.creditors.get(creditorId);
    if (!creditor) {
      throw new Error(`Creditor ${creditorId} not found`);
    }
    return creditor.get(debtorId) ?? null;
  }

  private hasDebtor(creditorId: CreditorId, debtorId: DebtorId) {
    const creditor = this.creditors.get(creditorId);
    if (!creditor) {
      throw new Error(`Creditor ${creditorId} not found`);
    }
    return creditor.has(debtorId);
  }

  private findRightmostIndex<T>(
    value: number,
    sortedArray: T[],
    getValue: (item: T) => number,
  ) {
    let start = 0;
    let end = sortedArray.length - 1;
    let rightmostIndex = -1;

    if (!sortedArray.length) {
      return -1;
    }

    // Extended binary search.
    while (start <= end) {
      const mid = start + Math.floor((end - start) / 2);
      const midValue = getValue(sortedArray[mid]);
      if (midValue === value) {
        rightmostIndex = mid;
        start = mid + 1;
      } else if (midValue < value) {
        start = mid + 1;
      } else {
        end = mid - 1;
      }
    }

    const finalIndex =
      rightmostIndex !== -1 ? rightmostIndex : Math.max(0, end);

    return getValue(sortedArray[finalIndex]) === 0 &&
      finalIndex + 1 < sortedArray.length
      ? finalIndex + 1
      : finalIndex;
  }
}
