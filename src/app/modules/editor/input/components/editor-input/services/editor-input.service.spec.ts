import { TestBed } from '@angular/core/testing';
import { EditorInputService } from './editor-input.service';

describe('EditorInputService', () => {
  let service: EditorInputService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EditorInputService]
    });
    service = TestBed.inject(EditorInputService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('parseHtml', () => {
    it('should handle empty string input', () => {
      const result = service.parseHtml('');
      expect(result.plainText).toBe('');
      expect(result.html.content).toBe('');
      expect(result.html.tags).toEqual([]);
    });

    it('should handle pure text input with no HTML tags', () => {
      const result = service.parseHtml('Hello World');
      expect(result.plainText).toBe('Hello World');
      expect(result.html.content).toBe('Hello World');
      expect(result.html.tags).toEqual([]);
    });

    it('should parse simple tag and map its position and contents correctly', () => {
      const result = service.parseHtml('Hello <b>world</b>!');
      expect(result.plainText).toBe('Hello world!');
      expect(result.html.content).toBe('Hello <b>world</b>!');
      expect(result.html.tags.length).toBe(2);

      // <b> tag
      expect(result.html.tags[0]).toEqual({
        tag: 'b',
        textPosition: 6
      });

      // </b> tag
      expect(result.html.tags[1]).toEqual({
        tag: '/b',
        textPosition: 11
      });
    });

    it('should parse nested and sequential tags correctly', () => {
      const result = service.parseHtml('<div>Welcome to <i>rich-text</i> editor</div>');
      expect(result.plainText).toBe(' Welcome to rich-text editor');
      expect(result.html.tags.length).toBe(4);

      // <div>
      expect(result.html.tags[0]).toEqual({
        tag: 'div',
        textPosition: 0
      });

      // <i>
      expect(result.html.tags[1]).toEqual({
        tag: 'i',
        textPosition: 12
      });

      // </i>
      expect(result.html.tags[2]).toEqual({
        tag: '/i',
        textPosition: 21
      });

      // </div>
      expect(result.html.tags[3]).toEqual({
        tag: '/div',
        textPosition: 28
      });
    });

    it('should handle and decode HTML entities in plain text position mapping', () => {
      // &nbsp; counts as 1 space, &amp; counts as 1 character '&'
      const result = service.parseHtml('Hello&nbsp;world&amp;everyone!');
      expect(result.plainText).toBe('Hello world&everyone!');
      expect(result.html.tags).toEqual([]);
    });

    it('should handle tags containing attributes', () => {
      const result = service.parseHtml('<span style="color: red;">Alert</span>');
      expect(result.plainText).toBe('Alert');
      expect(result.html.tags.length).toBe(2);

      // Opening tag with attribute
      expect(result.html.tags[0]).toEqual({
        tag: 'span style="color: red;"',
        textPosition: 0
      });

      // Closing tag
      expect(result.html.tags[1]).toEqual({
        tag: '/span',
        textPosition: 5
      });
    });

    it('should handle tags containing background-color inline styles from highlighter', () => {
      const result = service.parseHtml('<span style="background-color: rgb(255, 243, 205);">Highlight</span>');
      expect(result.plainText).toBe('Highlight');
      expect(result.html.tags.length).toBe(2);

      expect(result.html.tags[0]).toEqual({
        tag: 'span style="background-color: rgb(255, 243, 205);"',
        textPosition: 0
      });

      expect(result.html.tags[1]).toEqual({
        tag: '/span',
        textPosition: 9
      });
    });

    it('should handle stray < characters that are not tags', () => {
      const result1 = service.parseHtml('Hello <');
      expect(result1.plainText).toBe('Hello <');
      expect(result1.html.tags).toEqual([]);

      const result2 = service.parseHtml('5 < 10');
      expect(result2.plainText).toBe('5 < 10');
      expect(result2.html.tags).toEqual([]);

      const result3 = service.parseHtml('5 < 10 > 2');
      expect(result3.plainText).toBe('5 < 10 > 2');
      expect(result3.html.tags).toEqual([]);

      const result4 = service.parseHtml('<123>test</123>');
      expect(result4.plainText).toBe('<123>test</123>');
      expect(result4.html.tags).toEqual([]);

      const result5 = service.parseHtml('<div>asad</div><div>hmeed</div>');
      expect(result5.plainText).toBe(' asad hmeed');
      expect(result5.html.tags).toEqual([
        {
          tag: "div",
          textPosition: 0
        },
        {
          tag: "/div",
          textPosition: 5
        },
        {
          tag: "div",
          textPosition: 5
        },
        {
          tag: "/div",
          textPosition: 11
        }
      ]);
    });

    it('should parse image tags, extract src and positions correctly', () => {
      const result = service.parseHtml('Hello <img src="logo.png"> World!');
      expect(result.plainText).toBe('Hello  World!');
      
      const keys = Object.keys(result.images);
      expect(keys.length).toBe(1);
      
      const uuid = keys[0];
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      expect(result.images[uuid]).toEqual({
        src: 'logo.png',
        textPosition: 6
      });

      expect(result.html.tags.length).toBe(1);
      expect(result.html.tags[0]).toEqual({
        tag: `img src="${uuid}"`,
        textPosition: 6
      });
    });

    it('should parse multiple image tags correctly', () => {
      const result = service.parseHtml('A <img src="img1.png"> B <img src="img2.png"> C');
      expect(result.plainText).toBe('A  B  C');
      
      const keys = Object.keys(result.images);
      expect(keys.length).toBe(2);

      const uuid1 = keys[0];
      const uuid2 = keys[1];

      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(uuid2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(uuid1).not.toBe(uuid2);

      expect(result.images[uuid1]).toEqual({
        src: 'img1.png',
        textPosition: 2
      });
      expect(result.images[uuid2]).toEqual({
        src: 'img2.png',
        textPosition: 5
      });

      expect(result.html.tags.length).toBe(2);
      expect(result.html.tags[0]).toEqual({
        tag: `img src="${uuid1}"`,
        textPosition: 2
      });
      expect(result.html.tags[1]).toEqual({
        tag: `img src="${uuid2}"`,
        textPosition: 5
      });
    });
  });

  describe('image utilities and helpers', () => {
    it('should use custom imageUploadHandler if registered', async () => {
      const mockFile = new File([''], 'test.png', { type: 'image/png' });
      const mockUrl = 'https://example.com/uploaded.png';
      service.updateConfig({
        imageUploadHandler: (file: File) => Promise.resolve(mockUrl)
      });
      const result = await service.uploadImage(mockFile);
      expect(result).toBe(mockUrl);
    });

    it('should fall back to reading as Data URL if no handler registered', async () => {
      const mockFile = new File(['hello'], 'test.txt', { type: 'text/plain' });
      const result = await service.uploadImage(mockFile);
      expect(result).toContain('data:text/plain;base64,');
    });

    it('should calculate fit dimensions correctly within bounding box', () => {
      // 4:3 image fit in 800x600 -> should be 800x600
      let dims = service.calculateFitDimensions(400, 300, 800, 600);
      expect(dims).toEqual({ width: 800, height: 600 });

      // 4:3 image fit in 400x600 -> height would be 300, width 400
      dims = service.calculateFitDimensions(400, 300, 400, 600);
      expect(dims).toEqual({ width: 400, height: 300 });

      // 4:3 image fit in 800x300 -> height 300, width 400
      dims = service.calculateFitDimensions(400, 300, 800, 300);
      expect(dims).toEqual({ width: 400, height: 300 });
    });

    it('should calculate height from width proportionally', () => {
      const height = service.calculateHeightFromWidth(200, 400, 300);
      expect(height).toBe(150);
    });

    it('should calculate width from height proportionally', () => {
      const width = service.calculateWidthFromHeight(150, 400, 300);
      expect(width).toBe(200);
    });

    it('should calculate scaled dimensions relative to editor width', () => {
      const dims = service.calculateScaledDimensions(0.5, 400, 300, 600);
      expect(dims).toEqual({ width: 300, height: 225 });
    });
  });
});
