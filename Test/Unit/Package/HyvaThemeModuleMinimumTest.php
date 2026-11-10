<?php
/**
 * Copyright © 2026 Blue Fairy Development. All rights reserved.
 */

declare(strict_types=1);

namespace BlueFairy\CookieConsentHyva\Test\Unit\Package;

use PHPUnit\Framework\TestCase;

/**
 * Hyvä theme-module 1.3.x is fatal on Magento 2.4.9, so the package must not allow it.
 */
class HyvaThemeModuleMinimumTest extends TestCase
{
    public function testThemeModuleConstraintStartsAtOnePointFive(): void
    {
        $composer = json_decode((string) file_get_contents(__DIR__ . '/../../../composer.json'), true);
        self::assertIsArray($composer);
        self::assertSame('^1.5', $composer['require']['hyva-themes/magento2-theme-module'] ?? null);
    }
}
