CREATE TABLE `inscription_categories` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(100) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `inscription_categories_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inscriptions` (
  `id` VARCHAR(36) NOT NULL,
  `type` ENUM('PROMPT', 'TEMPLATE') NOT NULL,
  `templateKind` VARCHAR(40) NULL,
  `legacyKey` VARCHAR(120) NULL,
  `name` VARCHAR(160) NOT NULL,
  `description` TEXT NULL,
  `content` TEXT NOT NULL,
  `systemPrompt` TEXT NULL,
  `categoryId` INTEGER NULL,
  `tags` JSON NOT NULL,
  `modelId` VARCHAR(160) NULL,
  `modelParams` JSON NULL,
  `currentVersion` INTEGER NOT NULL DEFAULT 1,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `inscriptions_legacyKey_key`(`legacyKey`),
  INDEX `inscriptions_type_enabled_idx`(`type`, `enabled`),
  INDEX `inscriptions_categoryId_idx`(`categoryId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inscription_bindings` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `inscriptionId` VARCHAR(36) NOT NULL,
  `contextKey` VARCHAR(160) NOT NULL,
  INDEX `inscription_bindings_contextKey_idx`(`contextKey`),
  UNIQUE INDEX `inscription_bindings_inscriptionId_contextKey_key`(`inscriptionId`, `contextKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inscription_variables` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `inscriptionId` VARCHAR(36) NOT NULL,
  `key` VARCHAR(80) NOT NULL,
  `label` VARCHAR(120) NOT NULL,
  `defaultValue` VARCHAR(500) NULL,
  `required` BOOLEAN NOT NULL DEFAULT false,
  `placeholder` VARCHAR(200) NULL,
  UNIQUE INDEX `inscription_variables_inscriptionId_key_key`(`inscriptionId`, `key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inscription_versions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `inscriptionId` VARCHAR(36) NOT NULL,
  `version` INTEGER NOT NULL,
  `content` TEXT NOT NULL,
  `systemPrompt` TEXT NULL,
  `changeNote` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `inscription_versions_inscriptionId_version_key`(`inscriptionId`, `version`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `inscriptions` ADD CONSTRAINT `inscriptions_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `inscription_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `inscription_bindings` ADD CONSTRAINT `inscription_bindings_inscriptionId_fkey` FOREIGN KEY (`inscriptionId`) REFERENCES `inscriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `inscription_variables` ADD CONSTRAINT `inscription_variables_inscriptionId_fkey` FOREIGN KEY (`inscriptionId`) REFERENCES `inscriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `inscription_versions` ADD CONSTRAINT `inscription_versions_inscriptionId_fkey` FOREIGN KEY (`inscriptionId`) REFERENCES `inscriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
