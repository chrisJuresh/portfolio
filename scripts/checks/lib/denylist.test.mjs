import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PATTERNS, localPatterns, scan } from './denylist.mjs';

const names = (hits) => [...new Set(hits.map((hit) => hit.name))].sort();

test('a ticket key is a leak', () => {
  assert.deepEqual(names(scan('closed under PROJ-4821 last spring', PATTERNS)), ['ticket-key']);
  assert.equal(scan('closed under PROJ-4821 last spring', PATTERNS)[0].match, 'PROJ-4821');
});

test('the abbreviations a portfolio legitimately writes are not ticket keys', () => {
  // Every one of these would cost the author a prompt, which is the one thing
  // a blocking Check may not do. NOTES.md: the allowlist is the fix.
  for (const innocent of [
    'encoded as UTF-8',
    'ISO-8859-1 was the old default',
    'RFC-2119 language',
    'recorded in ADR-0003',
    'meets WCAG-2100 nothing',
    'built against ES-2022',
    'served over HTTP-2',
  ]) {
    assert.deepEqual(scan(innocent, PATTERNS), [], innocent);
  }
});

test('an internal hostname is a leak, a public one is not', () => {
  assert.deepEqual(names(scan('deployed to build-07.internal nightly', PATTERNS)), [
    'internal-host',
  ]);
  assert.deepEqual(names(scan('runs on jenkins.corp and stays there', PATTERNS)), [
    'internal-host',
  ]);
  assert.deepEqual(scan('the site is chrisj.uk and the repo is on github.com', PATTERNS), []);
});

test('a private address is a leak, a public one and a version number are not', () => {
  assert.deepEqual(names(scan('reachable at 10.4.19.220', PATTERNS)), ['private-ip']);
  assert.deepEqual(names(scan('bound to 192.168.1.10:8080', PATTERNS)), ['private-ip']);
  assert.deepEqual(names(scan('172.16.0.3 answered', PATTERNS)), ['private-ip']);
  assert.deepEqual(scan('resolved 8.8.8.8 fine', PATTERNS), []);
  assert.deepEqual(scan('pinned to astro 7.2.4 and gsap 3.15.0', PATTERNS), []);
  // 172.32 is public; only 172.16-172.31 are private.
  assert.deepEqual(scan('172.32.0.3 answered', PATTERNS), []);
});

test('a credential or a cloud resource name is a leak', () => {
  assert.deepEqual(names(scan('key AKIAIOSFODNN7EXAMPLE rotated', PATTERNS)), ['credential']);
  assert.deepEqual(names(scan('-----BEGIN RSA PRIVATE KEY-----', PATTERNS)), ['credential']);
  assert.deepEqual(names(scan('token ghp_0123456789abcdefghijklmnopqrstuvwxyz', PATTERNS)), [
    'credential',
  ]);
  assert.deepEqual(names(scan('arn:aws:s3:::some-bucket', PATTERNS)), ['cloud-resource']);
  assert.deepEqual(names(scan('ARN:AWS:S3:::some-bucket', PATTERNS)), ['cloud-resource']);
});

test('a credential pattern is case-sensitive, so lower-case prose is not a key', () => {
  // The access-key shapes are upper case by definition. Sharing an /i with the
  // arn: pattern made twenty lower-case letters after "akia" a credential, which
  // is a blocking Check firing on prose.
  assert.deepEqual(scan('akiaabcdefghijklmnopq was not a key', PATTERNS), []);
  assert.deepEqual(scan('asiaabcdefghijklmnopq either', PATTERNS), []);
});

test("the private record's own field names are a leak", () => {
  // Their presence means a session copied from the wrong half of the Career
  // Record rather than from a Portfolio copy field.
  assert.deepEqual(names(scan('see MASTER_RECORD.md for the rest', PATTERNS)), ['record-internal']);
  assert.deepEqual(names(scan('evidence: the deck from that quarter', PATTERNS)), [
    'record-internal',
  ]);
  assert.deepEqual(names(scan('pulled from career-record', PATTERNS)), ['record-internal']);
});

test('a confidentiality marker is a leak', () => {
  assert.deepEqual(names(scan('CONFIDENTIAL — do not circulate', PATTERNS)), ['marked-private']);
  assert.deepEqual(names(scan('Internal only, obviously', PATTERNS)), ['marked-private']);
  assert.deepEqual(names(scan('under NDA', PATTERNS)), ['marked-private']);
});

test('one hit per distinct match, and it says where', () => {
  const hits = scan('PROJ-1 no. AAA-1234 and AAA-1234 and BBB-5678', PATTERNS);
  assert.deepEqual(
    hits.map((hit) => hit.match),
    ['AAA-1234', 'BBB-5678'],
  );
  assert.equal(hits[0].at, 'PROJ-1 no. AAA-1234 and AAA-1234 and BBB-5678'.indexOf('AAA-1234'));
  assert.ok(hits[0].why.length > 0, 'every hit carries why it is one');
});

test('an empty or absent text is not a failure', () => {
  assert.deepEqual(scan('', PATTERNS), []);
  assert.deepEqual(scan(null, PATTERNS), []);
});

test('localPatterns reads one term per line and ignores comments and blanks', () => {
  const terms = localPatterns(['# names go here', '', 'Acme Corporation', '  Jane Roe  ', '#skip'].join('\n'));
  assert.equal(terms.length, 2);
  assert.deepEqual(names(scan('a project for Acme Corporation', terms)), ['local-term']);
  assert.deepEqual(names(scan('reviewed by jane roe', terms)), ['local-term']);
  assert.deepEqual(scan('nothing to see', terms), []);
});

test('a local term matches whole words only, so it cannot fire on a substring', () => {
  const terms = localPatterns('Ford');
  assert.deepEqual(scan('afford it', terms), []);
  assert.deepEqual(names(scan('a Ford, once', terms)), ['local-term']);
});

test('a local term with regex punctuation in it is matched literally', () => {
  const terms = localPatterns('a.b.internal\nC++ (legacy)');
  assert.deepEqual(names(scan('a.b.internal', terms)), ['local-term']);
  assert.deepEqual(scan('axbxinternal', terms), []);
  assert.deepEqual(names(scan('C++ (legacy)', terms)), ['local-term']);
});
