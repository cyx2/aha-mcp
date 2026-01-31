import { describe, it, expect } from '@jest/globals';
import {
  FEATURE_REF_REGEX,
  REQUIREMENT_REF_REGEX,
  NOTE_REF_REGEX,
} from '../types.js';

describe('Reference Number Regex Patterns', () => {
  describe('FEATURE_REF_REGEX', () => {
    describe('valid feature references', () => {
      const validRefs = [
        'PROJ-1',
        'PROJ-123',
        'PROJ-99999',
        'A-1',
        'ABC-1',
        'ABCDEFGHIJ-1',
        'PROJECT123-456',
        'A1B2C3-789',
        'ACTIVATION-59',
        'MONETIZE-100',
        'ACT-1',
      ];

      validRefs.forEach((ref) => {
        it(`should match "${ref}"`, () => {
          expect(FEATURE_REF_REGEX.test(ref)).toBe(true);
        });
      });
    });

    describe('invalid feature references', () => {
      const invalidRefs = [
        'proj-1',           // lowercase
        'Proj-1',           // mixed case
        'PROJ-',            // missing number
        'PROJ',             // no dash or number
        '-1',               // missing prefix
        'PROJ-1-1',         // requirement format
        'PROJ-N-1',         // note format
        '123-456',          // numeric prefix
        'PROJ_1',           // underscore instead of dash
        'PROJ-1a',          // alpha in number
        '',                 // empty string
        'PROJ--1',          // double dash
      ];

      invalidRefs.forEach((ref) => {
        it(`should not match "${ref}"`, () => {
          expect(FEATURE_REF_REGEX.test(ref)).toBe(false);
        });
      });
    });

    it('should capture prefix and number groups', () => {
      const match = 'ACTIVATION-59'.match(FEATURE_REF_REGEX);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('ACTIVATION');
      expect(match![2]).toBe('59');
    });
  });

  describe('REQUIREMENT_REF_REGEX', () => {
    describe('valid requirement references', () => {
      const validRefs = [
        'PROJ-1-1',
        'PROJ-123-456',
        'A-1-1',
        'ABCDEF-99-88',
        'PROJECT123-1-2',
        'ACTIVATION-59-1',
        'ACT-100-50',
      ];

      validRefs.forEach((ref) => {
        it(`should match "${ref}"`, () => {
          expect(REQUIREMENT_REF_REGEX.test(ref)).toBe(true);
        });
      });
    });

    describe('invalid requirement references', () => {
      const invalidRefs = [
        'proj-1-1',         // lowercase
        'PROJ-1',           // feature format
        'PROJ-N-1',         // note format
        'PROJ--1-1',        // double dash
        'PROJ-1-',          // missing last number
        'PROJ-1-1-1',       // too many segments
        'PROJ-a-1',         // alpha in middle
        '',                 // empty string
      ];

      invalidRefs.forEach((ref) => {
        it(`should not match "${ref}"`, () => {
          expect(REQUIREMENT_REF_REGEX.test(ref)).toBe(false);
        });
      });
    });

    it('should capture prefix and both number groups', () => {
      const match = 'ACTIVATION-59-3'.match(REQUIREMENT_REF_REGEX);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('ACTIVATION');
      expect(match![2]).toBe('59');
      expect(match![3]).toBe('3');
    });
  });

  describe('NOTE_REF_REGEX', () => {
    describe('valid note/page references', () => {
      const validRefs = [
        'PROJ-N-1',
        'PROJ-N-123',
        'A-N-1',
        'ABCDEF-N-99',
        'PROJECT123-N-456',
        'ACTIVATION-N-100',
        'DOC-N-1',
      ];

      validRefs.forEach((ref) => {
        it(`should match "${ref}"`, () => {
          expect(NOTE_REF_REGEX.test(ref)).toBe(true);
        });
      });
    });

    describe('invalid note/page references', () => {
      const invalidRefs = [
        'proj-N-1',         // lowercase prefix
        'PROJ-n-1',         // lowercase N
        'PROJ-1',           // feature format
        'PROJ-1-1',         // requirement format
        'PROJ-N-',          // missing number
        'PROJ-N',           // no number
        'PROJ-NN-1',        // double N
        'PROJ-M-1',         // wrong letter
        '',                 // empty string
      ];

      invalidRefs.forEach((ref) => {
        it(`should not match "${ref}"`, () => {
          expect(NOTE_REF_REGEX.test(ref)).toBe(false);
        });
      });
    });

    it('should capture prefix and number groups', () => {
      const match = 'ACTIVATION-N-213'.match(NOTE_REF_REGEX);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('ACTIVATION');
      expect(match![2]).toBe('213');
    });
  });

  describe('Regex pattern disambiguation', () => {
    it('should correctly identify feature vs requirement vs note', () => {
      const featureRef = 'PROJ-1';
      const requirementRef = 'PROJ-1-1';
      const noteRef = 'PROJ-N-1';

      // Feature ref should only match feature pattern
      expect(FEATURE_REF_REGEX.test(featureRef)).toBe(true);
      expect(REQUIREMENT_REF_REGEX.test(featureRef)).toBe(false);
      expect(NOTE_REF_REGEX.test(featureRef)).toBe(false);

      // Requirement ref should only match requirement pattern
      expect(FEATURE_REF_REGEX.test(requirementRef)).toBe(false);
      expect(REQUIREMENT_REF_REGEX.test(requirementRef)).toBe(true);
      expect(NOTE_REF_REGEX.test(requirementRef)).toBe(false);

      // Note ref should only match note pattern
      expect(FEATURE_REF_REGEX.test(noteRef)).toBe(false);
      expect(REQUIREMENT_REF_REGEX.test(noteRef)).toBe(false);
      expect(NOTE_REF_REGEX.test(noteRef)).toBe(true);
    });
  });
});
