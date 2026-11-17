import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env";
import { AdMobReport } from "./entities/AdMobReport";
import { PlayConsoleReport } from "./entities/PlayConsoleReports";
import { FirebaseReport } from "./entities/FirebaseReport";
import { GoogleAdsReport } from "./entities/GoogleAdsReport";
import { DailyCurrencyRate } from "./entities/DailyCurrencyRate";
import { DailyAnalytics } from "./entities/DailyAnalytics";

const globalForTypeORM = global as unknown as {
    dataSource: DataSource;
    dataSourceInitialization: Promise<DataSource> | undefined;
};

export const AppDataSource = globalForTypeORM.dataSource || new DataSource({
    type: "mysql",
    ...env.database,
    dateStrings: true,
    synchronize: false,
    logging: false,
    entities: [AdMobReport, PlayConsoleReport, FirebaseReport, GoogleAdsReport, DailyCurrencyRate, DailyAnalytics],
});

if (process.env.NODE_ENV !== "production") {
    globalForTypeORM.dataSource = AppDataSource;
}

export async function initializeDatabase() {
    if (!AppDataSource.isInitialized) {
        if (!globalForTypeORM.dataSourceInitialization) {
            globalForTypeORM.dataSourceInitialization = AppDataSource.initialize()
                .then(async (dataSource) => {
                    try {
                        await dataSource.query(`
                            ALTER TABLE admob_daily_reports
                            DROP COLUMN IF EXISTS requests_pl,
                            DROP COLUMN IF EXISTS pl_percentage,
                            DROP COLUMN IF EXISTS roas,
                            DROP COLUMN IF EXISTS ecpm_usd
                        `);
                    } catch {
                        // Ignore if columns do not exist
                    }
                    await dataSource.query(`
                        CREATE TABLE IF NOT EXISTS daily_analytics (
                            date date NOT NULL PRIMARY KEY,
                            total_revenue numeric(14, 2) NOT NULL DEFAULT 0.00,
                            p_l numeric(14, 2) NOT NULL DEFAULT 0.00,
                            roas numeric(14, 4) NOT NULL DEFAULT 0.00,
                            ecpm numeric(14, 2) NOT NULL DEFAULT 0.00,
                            created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                        )
                    `);
                    return dataSource;
                })
                .then((dataSource) => {
                    console.log("Database connection pool established successfully.");
                    return dataSource;
                })
                .catch((error) => {
                    globalForTypeORM.dataSourceInitialization = undefined;
                    throw error;
                });
        }
        await globalForTypeORM.dataSourceInitialization;
    }
    return AppDataSource;
}
