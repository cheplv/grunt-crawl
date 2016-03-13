/*
 * grunt-crawl
 * https://github.com/mfradcliffe/grunt-crawl
 *
 * Copyright (c) 2014 Matthew Radcliffe
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

    var Crawler = require('./webcrawler'),
    convert = require('data2xml')();

    grunt.registerMultiTask('crawl', 'Crawl a site with PhantomJS to generate sitemap.xml and static content.', function() {

        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            baseUrl: 'http://localhost:9000/',
            content: true,
            contentDir: 'www/static',
            sitemap: false,
            sitemapDir: 'www',
            render: false,
            renderDir: 'tmp',
            followFragment: '',
            fragmentPrefix: '!',
            readySelector: false,
            exclude: [],
            depth: 4,
            viewportWidth: 1280,
            viewportHeight: 1024,
            waitDelay: 5000
        });

        var done = this.async();
        
        // Check for trailing slash in base url
        if (options.baseUrl.slice(-1) !== '/') {
            options.baseUrl += '/';
        }

        try {
            var crawler = new Crawler(options.baseUrl, options.depth, options);
            var currentUrl = null;

            // Crawler iterator function
            function crawlerIterate(startCrawl) {
                
                startCrawl = startCrawl || false;
                
                if (!crawler.doneCrawling()) {
                    // Crawl the next url.
                    currentUrl = crawler.getNextUrl();
                    if (currentUrl.length) {
                        crawler.crawl(currentUrl, function(err, result) {
                            setTimeout(function() {
                                crawlerIterate(false);
                            }, 0);
                        });
                    }
                } else {
                    var sitemap = {
                        _attr: {xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9'},
                        url: []
                    };

                    for (var n in crawler.urls) {
                        var absoluteUrl = crawler.getAbsoluteUrl(n);
                        var filePath = crawler.getStaticFilename(n);

                        // Write out static content for file.
                        if (options.content) {
                            grunt.file.write(options.contentDir + filePath, crawler.urls[n].content);
                        }

                        // Add to site map JSON.
                        if (options.sitemap) {
                            sitemap.url.push({
                                'loc': absoluteUrl,
                                'lastmod': grunt.template.today('yyyy-mm-dd'),
                                'priority': (1 / crawler.urls[n].depth).toFixed(1),
                                'changefreq': 'weekly'
                            });
                        }
                    }

                    // Write out sitemap.
                    if (options.sitemap) {
                        grunt.file.write(options.sitemapDir + '/sitemap.xml', convert('urlset', sitemap));
                    }

                    crawler.stopPhantom();
                    done(true);
                }
            };
            
            // Configure the crawler options, first url, and node-phantom.
            crawler
                .addUrl(options.baseUrl, 0)
                .startPhantom(function(error, ph) {
                    if (error) {
                        throw 'Failed to start phantom';
                    }
                    crawlerIterate(true);
                });
        } catch (e) {
            grunt.log.error(e);
            done(false);
        }
  });
};
