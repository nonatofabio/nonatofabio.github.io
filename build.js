#!/usr/bin/env node
// Static build for the blog. Source of truth: blog/posts.json + blog/posts/*.md.
// Generates:
//   - blog/posts/<slug>.html   (static, fully crawlable post pages)
//   - blog/index.html          (post list injected between BUILD markers)
//   - index.html               (latest posts injected between BUILD markers)
//   - sitemap.xml, feed.xml, llms.txt
// Run `node build.js` after adding or editing a post, then commit the output.
// The deploy workflow also runs it, so published pages can never go stale.

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const SITE = 'https://nonatofabio.github.io';
const AUTHOR = 'Fabio Nonato de Paula';
const PERSON_ID = `${SITE}/#person`;
const HEADSHOT = `${SITE}/assets/headshot.jpeg`;
const LOCATION = 'Santa Rosa / SF Bay Area, CA';
const BLOG_TITLE = `${AUTHOR} — Blog`;
const BLOG_DESC = 'Thoughts on AI/ML infrastructure, developer tools, cybersecurity, and open source.';

const ROOT = __dirname;
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, content) => {
  fs.writeFileSync(path.join(ROOT, p), content);
  console.log(`wrote ${p}`);
};

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const escapeXml = escapeHtml;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const prettyDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
const isoDateTime = (iso) => `${iso}T00:00:00Z`;

// ---------------------------------------------------------------- load posts
const posts = JSON.parse(read('blog/posts.json')).posts
  .slice()
  .sort((a, b) => b.date.localeCompare(a.date))
  .map((post) => {
    const raw = read(`blog/posts/${post.slug}.md`);
    const fm = raw.match(/^---\n[\s\S]*?\n---\n/);
    let body = fm ? raw.slice(fm[0].length) : raw;
    // Post pages render the title as the page <h1>; drop a duplicate leading h1.
    body = body.replace(/^\s*#\s+[^\n]*\n/, '');
    return { ...post, body, url: `${SITE}/blog/posts/${post.slug}.html` };
  });

const latest = posts[0].date;

// ------------------------------------------------------------ post template
const GTAG = `<!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-TJ5S9V44SH"></script>
    <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-TJ5S9V44SH');
    </script>`;

const footer = (rel) => `<footer class="footer">
        <div class="container">
            <a href="${rel}" class="logo">{fnp}</a>
            <p>${LOCATION}</p>
            <a href="${rel}feed.xml" class="footer-rss" aria-label="Subscribe via RSS" title="RSS feed">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 11a9 9 0 0 1 9 9"/>
                    <path d="M4 4a16 16 0 0 1 16 16"/>
                    <circle cx="5" cy="19" r="1"/>
                </svg>
            </a>
        </div>
    </footer>`;

function postPage(post) {
  const title = `${post.title} | ${AUTHOR}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: post.url,
    datePublished: isoDateTime(post.date),
    dateModified: isoDateTime(post.updated || post.date),
    mainEntityOfPage: { '@type': 'WebPage', '@id': post.url },
    image: HEADSHOT,
    keywords: post.tags.join(', '),
    isPartOf: { '@type': 'Blog', '@id': `${SITE}/blog/#blog` },
    author: { '@type': 'Person', '@id': PERSON_ID, name: AUTHOR, url: `${SITE}/` },
    publisher: { '@type': 'Person', '@id': PERSON_ID, name: AUTHOR }
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog/` },
      { '@type': 'ListItem', position: 3, name: post.title, item: post.url }
    ]
  };
  const tags = post.tags.map((t) => `<span class="blog-tag">${escapeHtml(t)}</span>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    ${GTAG}
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <link rel="icon" type="image/svg+xml" href="../../favicon.svg">
    <meta name="description" content="${escapeHtml(post.description)}">
    <link rel="canonical" href="${post.url}">
    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="${post.url}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(post.description)}">
    <meta property="og:image" content="${HEADSHOT}">
    <meta property="article:published_time" content="${isoDateTime(post.date)}">
    <meta property="article:author" content="${SITE}/">
${post.tags.map((t) => `    <meta property="article:tag" content="${escapeHtml(t)}">`).join('\n')}
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(post.description)}">
    <meta name="twitter:image" content="${HEADSHOT}">
    <!-- RSS -->
    <link rel="alternate" type="application/atom+xml" title="${escapeHtml(BLOG_TITLE)}" href="${SITE}/feed.xml">
    <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../styles.css">
    <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
    </script>
    <script type="application/ld+json">
${JSON.stringify(breadcrumbLd, null, 2)}
    </script>
</head>
<body>
    <nav class="nav">
        <a href="../../" class="logo">{fnp}</a>
        <div class="nav-links">
            <a href="../../#about">About</a>
            <a href="../../#projects">Projects</a>
            <a href="../../#expertise">Expertise</a>
            <a href="../">Blog</a>
            <a href="../../#contact">Contact</a>
        </div>
    </nav>

    <header class="post-header">
        <div class="container">
            <a href="../" class="back-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to Blog
            </a>
            <div class="post-meta">
                <time datetime="${post.date}">${prettyDate(post.date)}</time>
            </div>
            <h1>${escapeHtml(post.title)}</h1>
            <div class="blog-card-tags">${tags}</div>
        </div>
    </header>

    <article class="blog-content">
${marked.parse(post.body)}
    </article>

    ${footer('../../')}
</body>
</html>
`;
}

// -------------------------------------------------------------- card markup
const card = (post, hrefPrefix) => `                <a href="${hrefPrefix}${post.slug}.html" class="blog-card">
                    <span class="blog-card-date"><time datetime="${post.date}">${prettyDate(post.date)}</time></span>
                    <h3 class="blog-card-title">${escapeHtml(post.title)}</h3>
                    <p class="blog-card-excerpt">${escapeHtml(post.description)}</p>
                    <div class="blog-card-tags">${post.tags.map((t) => `<span class="blog-tag">${escapeHtml(t)}</span>`).join('')}</div>
                </a>`;

function inject(file, marker, content) {
  const start = `<!-- BUILD:${marker} -->`;
  const end = `<!-- /BUILD:${marker} -->`;
  const html = read(file);
  const re = new RegExp(`${start}[\\s\\S]*?${end}`);
  if (!re.test(html)) throw new Error(`missing ${start} markers in ${file}`);
  write(file, html.replace(re, `${start}\n${content}\n                ${end}`));
}

// blog index: full post list + Blog JSON-LD
inject('blog/index.html', 'POST-LIST', posts.map((p) => card(p, './posts/')).join('\n'));
const blogLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  '@id': `${SITE}/blog/#blog`,
  name: BLOG_TITLE,
  description: BLOG_DESC,
  url: `${SITE}/blog/`,
  author: { '@type': 'Person', '@id': PERSON_ID, name: AUTHOR, url: `${SITE}/` },
  blogPost: posts.map((p) => ({
    '@type': 'BlogPosting',
    '@id': p.url,
    headline: p.title,
    description: p.description,
    url: p.url,
    datePublished: isoDateTime(p.date),
    author: { '@id': PERSON_ID }
  }))
};
inject('blog/index.html', 'BLOG-JSONLD',
  `    <script type="application/ld+json">\n${JSON.stringify(blogLd, null, 2)}\n    </script>`);

// homepage: three most recent posts
inject('index.html', 'POST-LIST', posts.slice(0, 3).map((p) => card(p, './blog/posts/')).join('\n'));

// ------------------------------------------------------------------- posts
for (const post of posts) {
  write(`blog/posts/${post.slug}.html`, postPage(post));
}

// ----------------------------------------------------------------- sitemap
const sitemapUrls = [
  { loc: `${SITE}/`, lastmod: latest, priority: '1.0' },
  { loc: `${SITE}/blog/`, lastmod: latest, priority: '0.8' },
  ...posts.map((p) => ({ loc: p.url, lastmod: p.updated || p.date, priority: '0.9' }))
];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`);

// -------------------------------------------------------------------- feed
write('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(BLOG_TITLE)}</title>
  <subtitle>${escapeXml(BLOG_DESC)}</subtitle>
  <link href="${SITE}/feed.xml" rel="self"/>
  <link href="${SITE}/blog/" rel="alternate"/>
  <id>${SITE}/</id>
  <updated>${isoDateTime(latest)}</updated>
  <author>
    <name>${escapeXml(AUTHOR)}</name>
    <uri>${SITE}/</uri>
  </author>
${posts.map((p) => `  <entry>
    <title>${escapeXml(p.title)}</title>
    <link href="${p.url}" rel="alternate"/>
    <id>${p.url}</id>
    <published>${isoDateTime(p.date)}</published>
    <updated>${isoDateTime(p.updated || p.date)}</updated>
    <summary>${escapeXml(p.description)}</summary>
${p.tags.map((t) => `    <category term="${escapeXml(t)}"/>`).join('\n')}
    <content type="html">${escapeXml(marked.parse(p.body))}</content>
  </entry>`).join('\n')}
</feed>
`);

// ----------------------------------------------------------------- llms.txt
write('llms.txt', `# Fabio Nonato de Paula

> Personal site and blog of Fabio Nonato de Paula, Principal Applied Scientist at AWS working on agentic AI, based in Santa Rosa / SF Bay Area, CA. He writes about building AI agents from scratch, agent memory systems, ML infrastructure, developer tools, and AI security — with a bias toward simple, auditable, local-first systems.

## Posts

${posts.map((p) => `- [${p.title}](${p.url}): ${p.description}`).join('\n')}

## About

- [Homepage](${SITE}/): bio, featured open-source projects, and areas of expertise
- [Blog index](${SITE}/blog/): all posts
- [GitHub](https://github.com/nonatofabio): open-source work, including luna-agent and local_faiss_mcp
- [Atom feed](${SITE}/feed.xml)
`);

console.log(`built ${posts.length} posts (latest: ${latest})`);
