const { db } = require('../src/database/connection');
const User = require('../src/models/User');
const Item = require('../src/models/Item');
const Deal = require('../src/models/Deal');
const Auction = require('../src/models/Auction');

describe('Models Tests', () => {
    beforeAll(async () => {
        // Setup test database connection
        process.env.NODE_ENV = 'test';
    });

    afterAll(async () => {
        await db.getClient().end();
    });

    describe('User Model', () => {
        test('should create a new user', async () => {
            const user = await User.create('123456789', 'testuser', ['role1', 'role2']);
            expect(user.discordId).toBe('123456789');
            expect(user.username).toBe('testuser');
            expect(user.roles).toEqual(['role1', 'role2']);
        });

        test('should find user by discord ID', async () => {
            const user = await User.findByDiscordId('123456789');
            expect(user).toBeTruthy();
            expect(user.discordId).toBe('123456789');
        });

        test('should check user roles', async () => {
            const user = await User.findByDiscordId('123456789');
            expect(user.hasRole('role1')).toBe(true);
            expect(user.hasRole('nonexistent')).toBe(false);
        });
    });

    describe('Item Model', () => {
        test('should create a new item', async () => {
            const item = await Item.create(
                '123456789',
                'Test Item',
                'Test Description',
                100.50,
                5,
                'test-category'
            );
            expect(item.title).toBe('Test Item');
            expect(item.price).toBe(100.50);
            expect(item.quantity).toBe(5);
            expect(item.status).toBe('active');
        });

        test('should find item by ID', async () => {
            const items = await Item.findActive();
            const item = await Item.findById(items[0].id);
            expect(item).toBeTruthy();
            expect(item.title).toBe('Test Item');
        });

        test('should find active items', async () => {
            const items = await Item.findActive();
            expect(items.length).toBeGreaterThan(0);
            expect(items[0].status).toBe('active');
        });

        test('should update item status', async () => {
            const items = await Item.findActive();
            const item = items[0];
            await item.updateStatus('closed');
            expect(item.status).toBe('closed');
        });
    });

    describe('Deal Model', () => {
        test('should create a new deal', async () => {
            const items = await Item.findActive();
            const deal = await Deal.create(
                items[0].id,
                '987654321',
                '123456789',
                100.50,
                1
            );
            expect(deal.itemId).toBe(items[0].id);
            expect(deal.buyerId).toBe('987654321');
            expect(deal.sellerId).toBe('123456789');
            expect(deal.status).toBe('active');
        });

        test('should find deal by ID', async () => {
            const deals = await Deal.findAllActive();
            const deal = await Deal.findById(deals[0].deal.id);
            expect(deal).toBeTruthy();
        });

        test('should update deal status', async () => {
            const deals = await Deal.findAllActive();
            const deal = deals[0].deal;
            await deal.updateStatus('completed', 'Test completion');
            expect(deal.status).toBe('completed');
            expect(deal.notes).toBe('Test completion');
        });
    });

    describe('Auction Model', () => {
        test('should create a new auction', async () => {
            const items = await Item.findActive();
            const startTime = new Date();
            const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
            
            const auction = await Auction.create(
                items[0].id,
                '123456789',
                startTime,
                endTime,
                50.00,
                5.00
            );
            expect(auction.itemId).toBe(items[0].id);
            expect(auction.minBid).toBe(50.00);
            expect(auction.step).toBe(5.00);
            expect(auction.status).toBe('active');
        });

        test('should find active auctions', async () => {
            const auctions = await Auction.findActive();
            expect(Array.isArray(auctions)).toBe(true);
        });

        test('should check if auction is active', async () => {
            const auctions = await Auction.findActive();
            if (auctions.length > 0) {
                const auction = auctions[0].auction;
                expect(typeof auction.isActive()).toBe('boolean');
            }
        });
    });
});
