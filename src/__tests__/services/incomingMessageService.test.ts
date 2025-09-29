
beforeAll(async () => {
    const testAssociates = [
        { first_name: 'John', last_name: 'Doe', work_date: '2023-10-01', start_time: '2023-10-01T09:00:00Z', phone_number: '+1234567890', email_address: 'john.doe@example.com' }
    ];

    await AssociatesDao.insertAssociates(testAssociates);
});

test("Check incoming Message Service", async () => {
  expect(true).toBe(true);
  expect(AssociatesDao.getAssociates()).resolves.toEqual([
    {
      first_name: 'John',
      last_name: 'Doe',
      work_date: '2023-10-01',
      start_time: '2023-10-01T09:00:00Z',
      phone_number: '+1234567890',
      email_address: 'john.doe@example.com'
    }
  ]);
});
    ]);
});

test("Check incoming Message Service", async () => {
  expect(true).toBe(true);
});
