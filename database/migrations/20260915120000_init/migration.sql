CREATE TABLE `categories` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(100) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `categories_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `books` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(160) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `author` VARCHAR(160) NULL,
  `summary` TEXT NULL,
  `cover` VARCHAR(255) NULL,
  `contentPath` VARCHAR(500) NOT NULL,
  `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
  `publishedAt` DATETIME(3) NULL,
  `categoryId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `books_slug_key`(`slug`),
  INDEX `books_status_publishedAt_idx`(`status`, `publishedAt`),
  INDEX `books_categoryId_idx`(`categoryId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `books`
  ADD CONSTRAINT `books_categoryId_fkey`
  FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
