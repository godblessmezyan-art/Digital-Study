CREATE TABLE `ai_model_configs` (
  `id` VARCHAR(36) NOT NULL,
  `apiFormat` VARCHAR(60) NOT NULL DEFAULT 'openai-chat-completions',
  `baseUrl` VARCHAR(500) NOT NULL,
  `useFullUrl` BOOLEAN NOT NULL DEFAULT false,
  `modelId` VARCHAR(160) NOT NULL,
  `displayName` VARCHAR(160) NOT NULL,
  `apiKeyCiphertext` TEXT NOT NULL,
  `apiKeyIv` VARCHAR(64) NOT NULL,
  `apiKeyAuthTag` VARCHAR(64) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `ai_model_configs_isActive_updatedAt_idx`(`isActive`, `updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
