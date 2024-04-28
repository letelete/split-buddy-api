```
const Creditors = {
  // Alice credits
  Alice: {
    Bob: {
      owes: 0,
      debts: [
        {
          expense: 3,
          history: [
            { expense: 3, grants: 5, amount: 5 },
            { expense: 2, grants: -5, amount: 0 },
          ],
        },
        {
          expense: 4,
          history: [
            { expense: 4, grants: 8, amount: 8 },
            { expense: 2, grants: -2, amount: 6 },
            { expense: 1, grants: -6, amount: 0 },
          ],
        },
      ],
    },
  },

  // Bob credits
  Bob: {
    Alice: {
      owes: 4,
      debts: [
        {
          expense: 1,
          history: [
            { expense: 1, grants: 10, amount: 10 },
            { expense: 4, grants: -6, amount: 4 },
          ],
        },
        {
          expense: 2,
          history: [
            { expense: 2, grants: 7, amount: 7 },
            { expense: 3, grants: -5, amount: 2 },
            { expense: 4, grants: -2, amount: 0 },
          ],
        },
      ],
    },
  },
};

// To answer how much one owes, For N people in the group, we need (N - 1) * K operations, where K is max(...debts)
// To answer how much one is owed, For N people in the group, we need (N - 1)

```
