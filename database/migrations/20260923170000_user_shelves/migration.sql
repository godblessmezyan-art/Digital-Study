CREATE TABLE `user_shelf_books` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `ownerId` VARCHAR(160) NOT NULL,
  `bookId` INTEGER NOT NULL,
  `status` ENUM('WANT_TO_READ', 'READING', 'COMPLETED') NOT NULL DEFAULT 'WANT_TO_READ',
  `progress` INTEGER NOT NULL DEFAULT 0,
  `lastReadAt` DATETIME(3) NULL,
  `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `user_shelf_books_ownerId_bookId_key`(`ownerId`, `bookId`),
  INDEX `user_shelf_books_ownerId_lastReadAt_idx`(`ownerId`, `lastReadAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_shelf_books`
  ADD CONSTRAINT `user_shelf_books_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT IGNORE INTO `user_shelf_books` (`ownerId`, `bookId`, `status`, `progress`, `lastReadAt`, `addedAt`, `updatedAt`)
SELECT `generation_tasks`.`ownerId`, `books`.`id`, 'WANT_TO_READ', 0, NULL, MIN(`generation_tasks`.`createdAt`), CURRENT_TIMESTAMP(3)
FROM `generation_tasks`
INNER JOIN `books` ON `books`.`slug` = `generation_tasks`.`bookSlug`
WHERE `generation_tasks`.`ownerId` IS NOT NULL AND `books`.`deletedAt` IS NULL
GROUP BY `generation_tasks`.`ownerId`, `books`.`id`;
