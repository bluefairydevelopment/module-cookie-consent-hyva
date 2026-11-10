<?php

/**
 * Copyright © 2026 Blue Fairy Development. All rights reserved.
 */

declare(strict_types=1);

namespace BlueFairy\CookieConsentHyva\Test\Unit\Package;

use PHPUnit\Framework\TestCase;

/**
 * @coversNothing
 */
class PackageTest extends TestCase
{
    private const ROOT = __DIR__ . '/../../..';

    public function testManifest(): void
    {
        $composer = json_decode((string) file_get_contents(self::ROOT . '/composer.json'), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('bluefairy/module-cookie-consent-hyva', $composer['name']);
        self::assertSame(['MIT'], $composer['license']);
        self::assertArrayHasKey('bluefairy/module-cookie-consent', $composer['require']);
        self::assertStringContainsString('MIT License', (string) file_get_contents(self::ROOT . '/LICENSE.txt'));
        self::assertStringContainsString("'BlueFairy_CookieConsentHyva'", (string) file_get_contents(self::ROOT . '/registration.php'));
    }

    public function testTheHyvaLayoutReplacesTheCoreBannerBlock(): void
    {
        $layout = (string) file_get_contents(self::ROOT . '/view/frontend/layout/hyva_default.xml');
        self::assertStringContainsString('name="bluefairy.cookieconsent.banner"', $layout);
        self::assertStringContainsString('BlueFairy_CookieConsentHyva::banner.phtml', $layout);
        self::assertFileExists(self::ROOT . '/view/frontend/templates/banner.phtml');
    }

    public function testRejectAndAcceptHaveEqualProminence(): void
    {
        $tpl = (string) file_get_contents(self::ROOT . '/view/frontend/templates/banner.phtml');
        preg_match('/<button[^>]*class="([^"]+)"[^>]*@click="rejectAll\(\)"/', $tpl, $reject);
        preg_match('/<button[^>]*class="([^"]+)"[^>]*@click="acceptAll\(\)"/', $tpl, $accept);
        self::assertNotEmpty($reject);
        self::assertSame($accept[1] ?? null, $reject[1]);
    }

    public function testTailwindScansTheTemplates(): void
    {
        self::assertStringContainsString('@source "../templates/**/*.phtml"',
            (string) file_get_contents(self::ROOT . '/view/frontend/tailwind/module.css'));
    }

    public function testNoToolCacheShipsInThePackage(): void
    {
        // npm writes its cache and logs to .cache/ in the package root; they once got committed.
        $ignore = (string) file_get_contents(self::ROOT . '/.gitignore');
        $attributes = (string) file_get_contents(self::ROOT . '/.gitattributes');
        self::assertMatchesRegularExpression('#^\.cache/$#m', $ignore);
        self::assertMatchesRegularExpression('#^\.cache/ export-ignore$#m', $attributes);
    }
}
