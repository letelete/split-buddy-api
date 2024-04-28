type ExpenseId = number;
type CreditorId = string;
type DebtorId = string;

interface DebtTransaction {
  expenseId: ExpenseId;
  grants: number;
  amount: number;
}

interface Debt {
  expenseId: ExpenseId;
  history: DebtTransaction[];
}

interface Debtor {
  owes: number;
  debts: Debt[];
}

type DebtorsMap = Map<DebtorId, Debtor>;

type CreditorsMap = Map<CreditorId, DebtorsMap>;

class DebtSimplifier {
  private creditors: CreditorsMap = new Map();

  constructor() {}

  initializeCreditors(creditors: CreditorsMap) {
    this.creditors = new Map(creditors);
  }

  /**
   * __START__: User A creates an expense Eid1, where they grant user B: X$ in form of a debt
   * 1. Upserts a relation A->B in the HashMap of creditors for A, where:
   * ```
   * const Creditors = {
   *   A: {
   *     B: {
   *       owes: owes + X$,
   *       debts: [
   *         { expense: Eid1, history: [{ expense: Eid1, grants: +X$, amount: +X$ }] },
   *       ],
   *     },
   *   },
   * };
   * ```
   * 2. Creates a relation B->A in the HashMap of creditors for B, where (or do nothing if relation B->A already exists):
   *```
   * const Creditors = {
   *   B: {
   *     A: {
   *       owes: 0,
   *       debts: [],
   *     },
   *   },
   * };
   *```
   * __END__
   */
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
   * 1. Try to simplify debt of B. In the relation A->B:
   *    Take the last record in the history with amount X$, where X$ > 0.
   *    In the relation B->A, take the first debt with expenseId Eid2,
   *    and amount Y$, where Y$ > 0$, such that X$ = Y$ + p, where p is minimal (closest to 0).
   * 2. Calculate new amount Ynew$, where Ynew$ = max(Y$ - X$, 0)
   * 3. Calculate new amount Xnew$, where Xnew$ = X$ - (Y$ - Y$new)
   * 4. Calculate grants amount G, where G = -1 * (X$ - Xnew$)
   * 5. Add the new amount Xnew$ to the history of Eid1.
   *    In the relation A->B, push `{ expense: Eid2, grants: G, amount: amount + grants }`.
   *    Update B's owes = owes + G.
   * 6. Add the new amount Ynew$ to the history of Eid2.
   *    In the relation B->A, push `{ expense: Eid1, grants: G, amount: amount + grants }`.
   *    Update A's owes = owes + G.
   * 7. If Xnew$ > 0, repeat from (1)
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
      console.debug(
        `Cannot simplify a debt that does not exist (${creditorId}<->${debtorId}).`,
      );
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
      .slice(0, debtBIndex)
      .reduce((sum, debt) => sum + this.getDebtAmount(debt), 0);

    while (X > 0) {
      if (debtBIndex === -1 || debtBIndex < 0) {
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

  getCreditors() {
    return this.creditors;
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
    debt.history.push({
      expenseId: fromExpenseId,
      grants,
      amount: debtor.owes + grants,
    });

    debtor.owes += grants;

    console.debug(
      `Upserted debt transaction (${creditorId}->${debtorId}}):`,
      this.getDebtor(creditorId, debtorId),
    );
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

    console.debug(
      `Initialized empty creditor (${creditorId}):`,
      this.creditors.get(creditorId),
    );
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

    console.debug(
      `Initialized empty debtor (${creditorId}->${debtorId}):`,
      this.creditors.get(creditorId)?.get(debtorId),
    );
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

  findRightmostIndex<T>(
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

const debtSimplifier = new DebtSimplifier();
console.log("--- creditors before ---\n", debtSimplifier.getCreditors());

const Bob = "Bob";
const Alice = "Alice";
const John = "John";
const expenses = [
  [Bob, Alice, 10],
  [Bob, Alice, 7],
  [Alice, Bob, 5],
  [Alice, Bob, 8],
  [Bob, Alice, 17],
  [John, Bob, 5],
  [Alice, John, 8],
  [John, Alice, 17],
] as const satisfies [CreditorId, DebtorId, number][];

expenses.forEach(([creditorId, debtorId, debtorOwes], index) =>
  debtSimplifier.add(creditorId, debtorId, debtorOwes, index + 1),
);

console.log(
  "final debt",
  Alice,
  "\n->",
  Bob,
  debtSimplifier.getCreditors().get(Bob)?.get(Alice)?.owes,
  "\n->",
  John,
  debtSimplifier.getCreditors().get(John)?.get(Alice)?.owes,
);
console.log(
  "final debt",
  Bob,
  "\n->",
  Alice,
  debtSimplifier.getCreditors().get(Alice)?.get(Bob)?.owes,
  "\n->",
  John,
  debtSimplifier.getCreditors().get(John)?.get(Bob)?.owes,
);
console.log(
  "final debt",
  John,
  "\n->",
  Alice,
  debtSimplifier.getCreditors().get(Alice)?.get(John)?.owes,
  "\n->",
  Bob,
  debtSimplifier.getCreditors().get(Bob)?.get(John)?.owes,
);
