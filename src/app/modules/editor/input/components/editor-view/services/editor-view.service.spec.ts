import { TestBed } from '@angular/core/testing';
import { EditorViewService } from './editor-view.service';
import { EditorObjectOutput } from '../../editor-input/types/editor-input.types';

describe('EditorViewService', () => {
  let service: EditorViewService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EditorViewService]
    });
    service = TestBed.inject(EditorViewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('reconstructHtml', () => {
    it('should return empty string for null or undefined input', () => {
      expect(service.reconstructHtml(null)).toBe('');
      expect(service.reconstructHtml(undefined)).toBe('');
    });

    it('should reconstruct plain text with no tags', () => {
      const data: EditorObjectOutput = {
        plainText: 'Hello World',
        html: { content: 'Hello World', tags: [] },
        images: {}
      };
      expect(service.reconstructHtml(data)).toBe('Hello World');
    });

    it('should escape HTML characters in plain text segments', () => {
      const data: EditorObjectOutput = {
        plainText: '5 < 10 & 2 > 1',
        html: { content: '5 &lt; 10 &amp; 2 &gt; 1', tags: [] },
        images: {}
      };
      expect(service.reconstructHtml(data)).toBe('5 &lt; 10 &amp; 2 &gt; 1');
    });

    it('should reconstruct basic tags correctly', () => {
      const data: EditorObjectOutput = {
        plainText: 'Hello world!',
        html: {
          content: 'Hello <b>world</b>!',
          tags: [
            { tag: 'b', textPosition: 6 },
            { tag: '/b', textPosition: 11 }
          ]
        },
        images: {}
      };
      expect(service.reconstructHtml(data)).toBe('Hello <b>world</b>!');
    });

    it('should reconstruct image tags with UUID mapping correctly', () => {
      const uuid = '7a9b0d1e-8e5f-4a3b-9c2d-1f6e8d0a3b2c';
      const data: EditorObjectOutput = {
        plainText: 'Hello  World!',
        html: {
          content: 'Hello <img src="logo.png" width="200"> World!',
          tags: [
            { tag: `img src="${uuid}" width="200"`, textPosition: 6 }
          ]
        },
        images: {
          [uuid]: {
            src: 'logo.png',
            textPosition: 6
          }
        }
      };
      expect(service.reconstructHtml(data)).toBe('Hello <img src="logo.png" width="200"> World!');
    });
  });
});
