import { describe, it, expect } from 'vitest';
import { reportService } from '../../services/reportService';
import { createTestUser } from '../helpers';
import { Block } from '../../models/Block';
import { Connection } from '../../models/Connection';
import { Report } from '../../models/Report';

describe('reportService', () => {
  describe('submitReport', () => {
    it('stores the reason and details', async () => {
      const reporter = await createTestUser({ email: 'a@test.com' });
      const reported = await createTestUser({ email: 'b@test.com' });

      await reportService.submitReport(
        reporter._id.toString(),
        reported._id.toString(),
        'Spam or scam',
        'Kept sending crypto links',
      );

      const report = await Report.findOne({ reporter: reporter._id });
      expect(report?.reported.toString()).toBe(reported._id.toString());
      expect(report?.reason).toBe('Spam or scam');
      expect(report?.details).toBe('Kept sending crypto links');
      expect(report?.status).toBe('new');
    });

    it('omits details when none are given', async () => {
      const reporter = await createTestUser({ email: 'a@test.com' });
      const reported = await createTestUser({ email: 'b@test.com' });

      await reportService.submitReport(
        reporter._id.toString(),
        reported._id.toString(),
        'Safety concern',
      );

      const report = await Report.findOne({ reporter: reporter._id });
      expect(report?.details).toBeUndefined();
    });

    it('does not block the reported user', async () => {
      const reporter = await createTestUser({ email: 'a@test.com' });
      const reported = await createTestUser({ email: 'b@test.com' });

      await reportService.submitReport(
        reporter._id.toString(),
        reported._id.toString(),
        'Harassment or bullying',
      );

      const blocks = await Block.find({});
      expect(blocks).toHaveLength(0);
    });

    it('leaves an existing connection intact', async () => {
      const reporter = await createTestUser({ email: 'a@test.com' });
      const reported = await createTestUser({ email: 'b@test.com' });
      await Connection.create({ user1: reporter._id, user2: reported._id });

      await reportService.submitReport(
        reporter._id.toString(),
        reported._id.toString(),
        'Inappropriate content',
      );

      const conn = await Connection.findOne({
        $or: [
          { user1: reporter._id, user2: reported._id },
          { user1: reported._id, user2: reporter._id },
        ],
      });
      expect(conn).not.toBeNull();
    });

    it('allows the same person to be reported more than once', async () => {
      const reporter = await createTestUser({ email: 'a@test.com' });
      const reported = await createTestUser({ email: 'b@test.com' });
      const ids = [reporter._id.toString(), reported._id.toString()] as const;

      await reportService.submitReport(ids[0], ids[1], 'Spam or scam');
      await reportService.submitReport(ids[0], ids[1], 'Harassment or bullying');

      const reports = await Report.find({ reporter: reporter._id });
      expect(reports).toHaveLength(2);
    });

    it('requires details when the reason is Other', async () => {
      const reporter = await createTestUser({ email: 'a@test.com' });
      const reported = await createTestUser({ email: 'b@test.com' });

      await expect(
        reportService.submitReport(reporter._id.toString(), reported._id.toString(), 'Other'),
      ).rejects.toThrow('Please describe the issue when choosing Other');

      // whitespace-only is not a description either
      await expect(
        reportService.submitReport(
          reporter._id.toString(),
          reported._id.toString(),
          'Other',
          '   ',
        ),
      ).rejects.toThrow('Please describe the issue when choosing Other');

      expect(await Report.countDocuments({})).toBe(0);
    });

    it('accepts Other when details are provided', async () => {
      const reporter = await createTestUser({ email: 'a@test.com' });
      const reported = await createTestUser({ email: 'b@test.com' });

      await reportService.submitReport(
        reporter._id.toString(),
        reported._id.toString(),
        'Other',
        'Impersonating a KinMeet staff member',
      );

      const report = await Report.findOne({ reporter: reporter._id });
      expect(report?.reason).toBe('Other');
      expect(report?.details).toBe('Impersonating a KinMeet staff member');
    });

    it('throws when reporting yourself', async () =>{
      const user = await createTestUser({ email: 'a@test.com' });
      await expect(
        reportService.submitReport(user._id.toString(), user._id.toString(), 'Other'),
      ).rejects.toThrow('Cannot report yourself');
    });

    it('throws when the reported user does not exist', async () => {
      const user = await createTestUser({ email: 'a@test.com' });
      await expect(
        reportService.submitReport(
          user._id.toString(),
          '000000000000000000000000',
          'Spam or scam',
        ),
      ).rejects.toThrow('User not found');
    });
  });
});
