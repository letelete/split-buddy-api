import { DebtSimplifier } from './debt-simplifier';

function* createIdGenerator(startFrom: number = 0) {
  let id = startFrom;
  while (true) {
    yield id;
    id++;
  }
  return id;
}

describe('DebtSimplifier', () => {
  let debtSimplifier: DebtSimplifier;
  let idGen = createIdGenerator();

  beforeEach(() => {
    debtSimplifier = new DebtSimplifier();
    idGen = createIdGenerator();
  });

  it('should correctly simplify debts between creditors and debtors', () => {
    debtSimplifier.add('A', 'B', 10, idGen.next().value);
    debtSimplifier.add('A', 'B', 5, idGen.next().value);
    debtSimplifier.add('B', 'A', 7, idGen.next().value);

    const creditors = debtSimplifier.getCreditors();

    expect(creditors.get('A')?.get('B')?.owes).toBe(8);
    expect(creditors.get('B')?.get('A')?.owes).toBe(0);
  });

  it('should handle multiple debts between the same creditors and debtors', () => {
    debtSimplifier.add('A', 'B', 10, idGen.next().value);
    debtSimplifier.add('A', 'B', 5, idGen.next().value);
    debtSimplifier.add('B', 'A', 7, idGen.next().value);
    debtSimplifier.add('A', 'B', 12, idGen.next().value);
    debtSimplifier.add('B', 'A', 3, idGen.next().value);

    const creditors = debtSimplifier.getCreditors();

    expect(creditors.get('A')?.get('B')?.owes).toBe(17);
    expect(creditors.get('B')?.get('A')?.owes).toBe(0);
  });

  it('should cover as much small transactions as possible when can cover all', () => {
    debtSimplifier.add('A', 'B', 7, idGen.next().value);
    debtSimplifier.add('A', 'B', 3, idGen.next().value);
    debtSimplifier.add('A', 'B', 2, idGen.next().value);
    debtSimplifier.add('A', 'B', 1, idGen.next().value);
    debtSimplifier.add('A', 'B', 1, idGen.next().value);
    debtSimplifier.add('A', 'B', 1, idGen.next().value);
    debtSimplifier.add('B', 'A', 14, idGen.next().value);

    const creditors = debtSimplifier.getCreditors();

    expect(creditors.get('A')?.get('B')?.owes).toBe(1);
    expect(creditors.get('B')?.get('A')?.owes).toBe(0);

    const bDebts = creditors.get('A')?.get('B').debts;

    expect(bDebts.length).toBe(6);
    expect(bDebts.find((e) => e.expenseId === 0).history.at(-1).amount).toBe(0);
    expect(bDebts.find((e) => e.expenseId === 1).history.at(-1).amount).toBe(0);
    expect(bDebts.find((e) => e.expenseId === 2).history.at(-1).amount).toBe(0);
    expect(bDebts.find((e) => e.expenseId === 3).history.at(-1).amount).toBe(0);
    expect(bDebts.find((e) => e.expenseId === 4).history.at(-1).amount).toBe(0);
    expect(bDebts.find((e) => e.expenseId === 5).history.at(-1).amount).toBe(1);
  });

  it('should cover as much small transactions as possible when can cover some', () => {
    debtSimplifier.add('A', 'B', 7, idGen.next().value);
    debtSimplifier.add('A', 'B', 2, idGen.next().value);
    debtSimplifier.add('A', 'B', 2, idGen.next().value);
    debtSimplifier.add('A', 'B', 1, idGen.next().value);
    debtSimplifier.add('A', 'B', 1, idGen.next().value);
    debtSimplifier.add('A', 'B', 1, idGen.next().value);
    debtSimplifier.add('B', 'A', 7, idGen.next().value);

    const creditors = debtSimplifier.getCreditors();

    expect(creditors.get('A')?.get('B')?.owes).toBe(7);
    expect(creditors.get('B')?.get('A')?.owes).toBe(0);

    const bDebts = creditors.get('A')?.get('B').debts;

    expect(bDebts.length).toBe(6);
    expect(bDebts.find((e) => e.expenseId === 0).history.at(-1).amount).toBe(7);
    expect(bDebts.find((e) => e.expenseId === 1).history.at(-1).amount).toBe(0);
    expect(bDebts.find((e) => e.expenseId === 2).history.at(-1).amount).toBe(0);
    expect(bDebts.find((e) => e.expenseId === 3).history.at(-1).amount).toBe(0);
    expect(bDebts.find((e) => e.expenseId === 4).history.at(-1).amount).toBe(0);
    expect(bDebts.find((e) => e.expenseId === 5).history.at(-1).amount).toBe(0);
  });

  it('should cover as much small transactions as possible when can cover some, and partial', () => {
    debtSimplifier.add('A', 'B', 7, idGen.next().value);
    debtSimplifier.add('A', 'B', 2, idGen.next().value);
    debtSimplifier.add('A', 'B', 2, idGen.next().value);
    debtSimplifier.add('A', 'B', 1, idGen.next().value);
    debtSimplifier.add('A', 'B', 1, idGen.next().value);
    debtSimplifier.add('A', 'B', 1, idGen.next().value);
    debtSimplifier.add('B', 'A', 11, idGen.next().value);

    const creditors = debtSimplifier.getCreditors();

    expect(creditors.get('A')?.get('B')?.owes).toBe(3);
    expect(creditors.get('B')?.get('A')?.owes).toBe(0);

    const bDebts = creditors.get('A')?.get('B').debts;

    expect(bDebts.length).toBe(6);
    expect(bDebts.find((e) => e.expenseId === 0).history.at(-1).amount).toBe(0);
    expect(bDebts.find((e) => e.expenseId === 1).history.at(-1).amount).toBe(0);
    expect(bDebts.find((e) => e.expenseId === 2).history.at(-1).amount).toBe(0);
    expect(bDebts.find((e) => e.expenseId === 3).history.at(-1).amount).toBe(1);
    expect(bDebts.find((e) => e.expenseId === 4).history.at(-1).amount).toBe(1);
    expect(bDebts.find((e) => e.expenseId === 5).history.at(-1).amount).toBe(1);
  });

  it('should correctly simplify debts when multiple transactions are involved', () => {
    debtSimplifier.add('A', 'B', 10, idGen.next().value);
    debtSimplifier.add('A', 'B', 5, idGen.next().value);
    debtSimplifier.add('B', 'A', 7, idGen.next().value);
    debtSimplifier.add('B', 'A', 3, idGen.next().value);

    const creditors = debtSimplifier.getCreditors();

    expect(creditors.get('A')?.get('B')?.owes).toBe(5);
    expect(creditors.get('B')?.get('A')?.owes).toBe(0);
  });

  it('should maintain debts between creditors and debtors', () => {
    debtSimplifier.add('A', 'B', 50, idGen.next().value);
    debtSimplifier.add('X', 'Y', 100, idGen.next().value);
    debtSimplifier.add('O', 'P', 200, idGen.next().value);
    debtSimplifier.add('M', 'N', 300, idGen.next().value);

    const creditors = debtSimplifier.getCreditors();

    expect(creditors.get('A')?.get('B')?.owes).toBe(50);
    expect(creditors.get('X')?.get('Y')?.owes).toBe(100);
    expect(creditors.get('O')?.get('P')?.owes).toBe(200);
    expect(creditors.get('M')?.get('N')?.owes).toBe(300);
  });

  it('should correctly simplify debts when multiple transactions are involved, and more than 2 people', () => {
    debtSimplifier.add('A', 'B', 10, idGen.next().value);
    debtSimplifier.add('A', 'B', 5, idGen.next().value);
    debtSimplifier.add('A', 'C', 5, idGen.next().value);
    debtSimplifier.add('B', 'A', 7, idGen.next().value);
    debtSimplifier.add('B', 'A', 3, idGen.next().value);
    debtSimplifier.add('C', 'B', 10, idGen.next().value);
    debtSimplifier.add('C', 'A', 10, idGen.next().value);

    const creditors = debtSimplifier.getCreditors();

    expect(creditors.get('A')?.get('B')?.owes).toBe(5);
    expect(creditors.get('A')?.get('C')?.owes).toBe(0);
    expect(creditors.get('B')?.get('A')?.owes).toBe(0);
    expect(creditors.get('B')?.get('C')?.owes).toBe(0);
    expect(creditors.get('C')?.get('A')?.owes).toBe(5);
    expect(creditors.get('C')?.get('B')?.owes).toBe(10);
  });

  it('should correctly simplify debts when multiple transactions are involved, and more than 2 people, and order does not matter', () => {
    debtSimplifier.add('C', 'A', 10, idGen.next().value);
    debtSimplifier.add('B', 'A', 7, idGen.next().value);
    debtSimplifier.add('A', 'B', 10, idGen.next().value);
    debtSimplifier.add('B', 'A', 3, idGen.next().value);
    debtSimplifier.add('A', 'C', 5, idGen.next().value);
    debtSimplifier.add('C', 'B', 10, idGen.next().value);
    debtSimplifier.add('A', 'B', 5, idGen.next().value);

    const creditors = debtSimplifier.getCreditors();

    expect(creditors.get('A')?.get('B')?.owes).toBe(5);
    expect(creditors.get('A')?.get('C')?.owes).toBe(0);
    expect(creditors.get('B')?.get('A')?.owes).toBe(0);
    expect(creditors.get('B')?.get('C')?.owes).toBe(0);
    expect(creditors.get('C')?.get('A')?.owes).toBe(5);
    expect(creditors.get('C')?.get('B')?.owes).toBe(10);
  });

  it('should correctly convert to json, and load parsed structure', () => {
    debtSimplifier.add('C', 'A', 10, idGen.next().value);
    debtSimplifier.add('B', 'A', 7, idGen.next().value);
    debtSimplifier.add('A', 'B', 10, idGen.next().value);
    debtSimplifier.add('B', 'A', 3, idGen.next().value);
    debtSimplifier.add('A', 'C', 5, idGen.next().value);
    debtSimplifier.add('C', 'B', 10, idGen.next().value);
    debtSimplifier.add('A', 'B', 5, idGen.next().value);

    const creditorsAsJson = debtSimplifier.toJSON();

    const newDebtSimplifier = new DebtSimplifier();
    newDebtSimplifier.fromJSON(creditorsAsJson);

    const creditors = newDebtSimplifier.getCreditors();

    expect(creditors.get('A')?.get('B')?.owes).toBe(5);
    expect(creditors.get('A')?.get('C')?.owes).toBe(0);
    expect(creditors.get('B')?.get('A')?.owes).toBe(0);
    expect(creditors.get('B')?.get('C')?.owes).toBe(0);
    expect(creditors.get('C')?.get('A')?.owes).toBe(5);
    expect(creditors.get('C')?.get('B')?.owes).toBe(10);
  });

  it('should correctly operate on parsed structure', () => {
    debtSimplifier.add('C', 'A', 10, idGen.next().value);
    debtSimplifier.add('B', 'A', 7, idGen.next().value);
    debtSimplifier.add('A', 'B', 10, idGen.next().value);

    const creditorsAsJson = debtSimplifier.toJSON();
    const debtSimplifier2 = new DebtSimplifier();
    debtSimplifier2.fromJSON(creditorsAsJson);

    debtSimplifier2.add('B', 'A', 3, idGen.next().value);
    debtSimplifier2.add('A', 'C', 5, idGen.next().value);

    const creditorsAsJson2 = debtSimplifier2.toJSON();
    const debtSimplifier3 = new DebtSimplifier();
    debtSimplifier3.fromJSON(creditorsAsJson2);

    debtSimplifier3.add('C', 'B', 10, idGen.next().value);
    debtSimplifier3.add('A', 'B', 5, idGen.next().value);

    const creditors = debtSimplifier3.getCreditors();

    expect(creditors.get('A')?.get('B')?.owes).toBe(5);
    expect(creditors.get('A')?.get('C')?.owes).toBe(0);
    expect(creditors.get('B')?.get('A')?.owes).toBe(0);
    expect(creditors.get('B')?.get('C')?.owes).toBe(0);
    expect(creditors.get('C')?.get('A')?.owes).toBe(5);
    expect(creditors.get('C')?.get('B')?.owes).toBe(10);
  });

  it('should handle missing creditors and debtors gracefully', () => {
    expect(() => debtSimplifier.add('A', 'B', 10, 1)).not.toThrow();
    expect(() => debtSimplifier.add('A', 'C', 5, 2)).not.toThrow();
  });

  it('should handle empty debts and creditors', () => {
    const creditors = debtSimplifier.getCreditors();

    expect(creditors.size).toBe(0);

    expect(() =>
      debtSimplifier.add('A', 'B', 10, idGen.next().value),
    ).not.toThrow();

    expect(creditors.size).toBe(2);
  });
});
