<?php

/**
 * Copyright © 2026 Blue Fairy Development. All rights reserved.
 */

declare(strict_types=1);

namespace BlueFairy\CookieConsentHyva\Test\Unit\Template;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Hyvä strict CSP rules for every template in this package.
 *
 * 1. An inline script runs only when Hyvä registers it (nonce or hash), so each one must be
 *    followed directly by $hyvaCsp->registerInlineScript().
 * 2. The Alpine CSP build cannot evaluate expressions, so an Alpine attribute may hold only a
 *    property or method name (dotted paths allowed), or "item in list" for x-for.
 *
 * @coversNothing
 */
class StrictCspTemplateTest extends TestCase
{
    private const TEMPLATES = __DIR__ . '/../../../view/frontend/templates';

    private const NAME = '[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*';

    /**
     * Inline scripts in an HTML fragment that are not followed by a registration call.
     *
     * @param string $html
     * @return string[]
     */
    public static function unregisteredInlineScripts(string $html): array
    {
        preg_match_all('#<script\b([^>]*)>(.*?)</script>(\s*)(<\?php\s+\$hyvaCsp->registerInlineScript\(\)\s*;?\s*\?>)?#is', $html, $all, PREG_SET_ORDER);
        $bad = [];
        foreach ($all as $m) {
            $isExternal = (bool) preg_match('#\bsrc\s*=#i', $m[1]);
            if (!$isExternal && empty($m[4])) {
                $bad[] = trim($m[0]);
            }
        }

        return $bad;
    }

    /**
     * Alpine attributes whose value is an expression rather than a name.
     *
     * @param string $html
     * @return string[]
     */
    public static function alpineExpressions(string $html): array
    {
        preg_match_all('#\s((?:x-[\w:.-]+|@[\w.:-]+|:[\w.-]+))="([^"]*)"#', $html, $all, PREG_SET_ORDER);
        $bad = [];
        foreach ($all as [, $attr, $value]) {
            $value = trim($value);
            $ok = $attr === 'x-for'
                ? (bool) preg_match('#^' . self::NAME . '\s+in\s+' . self::NAME . '$#', $value)
                : ($value === '' || (bool) preg_match('#^' . self::NAME . '$#', $value));
            if (!$ok) {
                $bad[] = $attr . '="' . $value . '"';
            }
        }

        return $bad;
    }

    /**
     * @return array<string, array{string}>
     */
    public static function templates(): array
    {
        $out = [];
        $files = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(self::TEMPLATES));
        foreach ($files as $file) {
            if ($file->isFile() && $file->getExtension() === 'phtml') {
                $out[substr($file->getPathname(), strlen(self::TEMPLATES) + 1)] = [$file->getPathname()];
            }
        }

        return $out;
    }

    public function testEveryTemplateIsChecked(): void
    {
        self::assertArrayHasKey('banner.phtml', self::templates());
    }

    /**
     * @dataProvider templates
     */
    #[DataProvider('templates')]
    public function testEveryInlineScriptIsRegistered(string $path): void
    {
        self::assertSame([], self::unregisteredInlineScripts((string) file_get_contents($path)));
    }

    /**
     * @dataProvider templates
     */
    #[DataProvider('templates')]
    public function testNoAlpineAttributeHoldsAnExpression(string $path): void
    {
        $html = (string) file_get_contents($path);
        self::assertStringContainsString('x-data=', $html, 'the check must see Alpine markup');
        self::assertSame([], self::alpineExpressions($html));
    }

    public function testTheChecksCatchWhatTheyAreFor(): void
    {
        // Positive controls: each rule must flag a planted violation, and pass its fixed form.
        self::assertCount(1, self::unregisteredInlineScripts('<script>var a = 1;</script><div></div>'));
        self::assertSame([], self::unregisteredInlineScripts(
            "<script>var a = 1;</script>\n<?php \$hyvaCsp->registerInlineScript() ?>"
        ));
        self::assertSame([], self::unregisteredInlineScripts('<script src="/x.js"></script>'));

        self::assertSame(
            ['@click="rejectAll()"', 'x-show="!prefsOpen"', ':checked="isSelected(category.code)"', 'x-data="bfCookieConsent()"'],
            self::alpineExpressions(
                '<b @click="rejectAll()" x-show="!prefsOpen" :checked="isSelected(category.code)"'
                . ' x-data="bfCookieConsent()"></b>'
            )
        );
        self::assertSame([], self::alpineExpressions(
            '<b @click="rejectAll" x-show="prefsOpen" :value="category.code" x-cloak'
            . ' x-for="category in categories" x-data="bfCookieConsent"></b>'
        ));
        self::assertSame(['x-for="c in list.filter(x)"'], self::alpineExpressions('<template x-for="c in list.filter(x)">'));
    }
}
