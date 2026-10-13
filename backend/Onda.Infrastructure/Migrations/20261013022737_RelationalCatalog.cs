using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Onda.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RelationalCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AlternateStreamUrl",
                table: "Stations",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ArtworkUrl",
                table: "Stations",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Availability",
                table: "Stations",
                type: "varchar(16)",
                unicode: false,
                maxLength: 16,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Bitrate",
                table: "Stations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ClickCount",
                table: "Stations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ClickTrend",
                table: "Stations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Codec",
                table: "Stations",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ConsecutiveFailedChecks",
                table: "Stations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "Stations",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CountryCode",
                table: "Stations",
                type: "varchar(2)",
                unicode: false,
                maxLength: 2,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "FirstSeenAt",
                table: "Stations",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<bool>(
                name: "HasHttpsStream",
                table: "Stations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Homepage",
                table: "Stations",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Stations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsHls",
                table: "Stations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPrimaryVariant",
                table: "Stations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Language",
                table: "Stations",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastSeenAt",
                table: "Stations",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "Stations",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "Stations",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Stations",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Region",
                table: "Stations",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "SampleKey",
                table: "Stations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SearchName",
                table: "Stations",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SearchRegion",
                table: "Stations",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SourceChangedAt",
                table: "Stations",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SourceCheckOk",
                table: "Stations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SourceCheckedAt",
                table: "Stations",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StreamUrl",
                table: "Stations",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "VariantKey",
                table: "Stations",
                type: "varchar(40)",
                unicode: false,
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Votes",
                table: "Stations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "StationLanguages",
                columns: table => new
                {
                    StationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false, collation: "Latin1_General_100_BIN2"),
                    Position = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StationLanguages", x => new { x.StationId, x.Code });
                    table.ForeignKey(
                        name: "FK_StationLanguages_Stations_StationId",
                        column: x => x.StationId,
                        principalTable: "Stations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StationReports",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Kind = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    StreamUrl = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    AppVersion = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Platform = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Status = table.Column<string>(type: "varchar(16)", unicode: false, maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StationReports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StationTags",
                columns: table => new
                {
                    StationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Tag = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false, collation: "Latin1_General_100_BIN2"),
                    Position = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StationTags", x => new { x.StationId, x.Tag });
                    table.ForeignKey(
                        name: "FK_StationTags_Stations_StationId",
                        column: x => x.StationId,
                        principalTable: "Stations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SyncRuns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StartedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    HeartbeatAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Status = table.Column<string>(type: "varchar(16)", unicode: false, maxLength: 16, nullable: false),
                    NextOffset = table.Column<int>(type: "int", nullable: false),
                    Processed = table.Column<int>(type: "int", nullable: false),
                    Upserted = table.Column<int>(type: "int", nullable: false),
                    LastError = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SyncRuns", x => x.Id);
                });

            // Preserve the cached catalog written by InitialSqlServerCatalog (JSON snapshots) before dropping Payload.
            // SearchName is an approximation here; the next synchronization rewrites it with full accent folding.
            migrationBuilder.Sql("""
                UPDATE Stations SET
                  Name = LEFT(ISNULL(JSON_VALUE(Payload, '$.Name'), ''), 300),
                  SearchName = LOWER(LEFT(ISNULL(JSON_VALUE(Payload, '$.Name'), ''), 300)),
                  CountryCode = UPPER(LEFT(ISNULL(JSON_VALUE(Payload, '$.CountryCode'), ''), 2)),
                  Country = LEFT(ISNULL(JSON_VALUE(Payload, '$.Country'), ''), 100),
                  Language = LEFT(ISNULL(JSON_VALUE(Payload, '$.Language'), ''), 200),
                  StreamUrl = LEFT(ISNULL(JSON_VALUE(Payload, '$.StreamUrl'), ''), 2000),
                  ArtworkUrl = LEFT(JSON_VALUE(Payload, '$.ArtworkUrl'), 2000),
                  Codec = LEFT(ISNULL(JSON_VALUE(Payload, '$.Codec'), ''), 40),
                  Bitrate = ISNULL(TRY_CAST(JSON_VALUE(Payload, '$.Bitrate') AS int), 0),
                  Votes = ISNULL(TRY_CAST(JSON_VALUE(Payload, '$.Votes') AS int), 0),
                  Latitude = TRY_CAST(JSON_VALUE(Payload, '$.Latitude') AS float),
                  Longitude = TRY_CAST(JSON_VALUE(Payload, '$.Longitude') AS float),
                  Availability = 'unknown', IsActive = 1, IsPrimaryVariant = 1, SourceCheckOk = 1,
                  FirstSeenAt = UpdatedAt, LastSeenAt = UpdatedAt,
                  SampleKey = ABS(CHECKSUM(Id)) % 1000000
                WHERE ISJSON(Payload) = 1;
                """);
            migrationBuilder.Sql("UPDATE Stations SET HasHttpsStream = CASE WHEN StreamUrl LIKE 'https://%' THEN 1 ELSE 0 END;");
            migrationBuilder.Sql("""
                INSERT INTO StationTags (StationId, Tag, Position)
                SELECT s.Id, LEFT(LOWER(LTRIM(RTRIM(t.value))), 40), MIN(CAST(t.[key] AS int))
                FROM Stations s CROSS APPLY OPENJSON(s.Payload, '$.Tags') t
                WHERE ISJSON(s.Payload) = 1 AND LEN(LTRIM(RTRIM(t.value))) >= 2
                GROUP BY s.Id, LEFT(LOWER(LTRIM(RTRIM(t.value))), 40);
                """);
            migrationBuilder.DropColumn(
                name: "Payload",
                table: "Stations");

            migrationBuilder.CreateIndex(
                name: "IX_Stations_ClickCount",
                table: "Stations",
                column: "ClickCount")
                .Annotation("SqlServer:Include", new[] { "IsActive", "HasHttpsStream", "Availability", "IsPrimaryVariant", "CountryCode" });

            migrationBuilder.CreateIndex(
                name: "IX_Stations_CountryCode_ClickCount",
                table: "Stations",
                columns: new[] { "CountryCode", "ClickCount" })
                .Annotation("SqlServer:Include", new[] { "IsActive", "HasHttpsStream", "Availability", "IsPrimaryVariant", "Votes" });

            migrationBuilder.CreateIndex(
                name: "IX_Stations_CountryCode_SearchRegion",
                table: "Stations",
                columns: new[] { "CountryCode", "SearchRegion" });

            migrationBuilder.CreateIndex(
                name: "IX_Stations_Geo",
                table: "Stations",
                columns: new[] { "Latitude", "Longitude" },
                filter: "[Latitude] IS NOT NULL")
                .Annotation("SqlServer:Include", new[] { "IsActive", "HasHttpsStream", "Availability", "IsPrimaryVariant", "CountryCode", "ClickCount" });

            migrationBuilder.CreateIndex(
                name: "IX_Stations_LastSeenAt",
                table: "Stations",
                column: "LastSeenAt");

            migrationBuilder.CreateIndex(
                name: "IX_Stations_SampleKey",
                table: "Stations",
                column: "SampleKey");

            migrationBuilder.CreateIndex(
                name: "IX_Stations_SearchName",
                table: "Stations",
                column: "SearchName");

            migrationBuilder.CreateIndex(
                name: "IX_Stations_VariantKey",
                table: "Stations",
                column: "VariantKey",
                filter: "[VariantKey] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_StationLanguages_Code",
                table: "StationLanguages",
                column: "Code");

            migrationBuilder.CreateIndex(
                name: "IX_StationReports_StationId_CreatedAt",
                table: "StationReports",
                columns: new[] { "StationId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_StationReports_Status_CreatedAt",
                table: "StationReports",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_StationTags_Tag",
                table: "StationTags",
                column: "Tag");

            migrationBuilder.CreateIndex(
                name: "IX_SyncRuns_StartedAt",
                table: "SyncRuns",
                column: "StartedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Payload",
                table: "Stations",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
            migrationBuilder.Sql("""
                UPDATE s SET Payload = (SELECT s.Id AS Id, s.Name AS Name, s.Country AS Country, s.CountryCode AS CountryCode,
                    s.Language AS Language,
                    JSON_QUERY(ISNULL((SELECT '[' + STRING_AGG('"' + STRING_ESCAPE(t.Tag, 'json') + '"', ',') WITHIN GROUP (ORDER BY t.Position) + ']'
                      FROM StationTags t WHERE t.StationId = s.Id), '[]')) AS Tags,
                    s.StreamUrl AS StreamUrl, s.ArtworkUrl AS ArtworkUrl, s.Codec AS Codec, s.Bitrate AS Bitrate, s.Votes AS Votes,
                    s.Latitude AS Latitude, s.Longitude AS Longitude
                  FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)
                FROM Stations s;
                """);

            migrationBuilder.DropTable(
                name: "StationLanguages");

            migrationBuilder.DropTable(
                name: "StationReports");

            migrationBuilder.DropTable(
                name: "StationTags");

            migrationBuilder.DropTable(
                name: "SyncRuns");

            migrationBuilder.DropIndex(
                name: "IX_Stations_ClickCount",
                table: "Stations");

            migrationBuilder.DropIndex(
                name: "IX_Stations_CountryCode_ClickCount",
                table: "Stations");

            migrationBuilder.DropIndex(
                name: "IX_Stations_CountryCode_SearchRegion",
                table: "Stations");

            migrationBuilder.DropIndex(
                name: "IX_Stations_Geo",
                table: "Stations");

            migrationBuilder.DropIndex(
                name: "IX_Stations_LastSeenAt",
                table: "Stations");

            migrationBuilder.DropIndex(
                name: "IX_Stations_SampleKey",
                table: "Stations");

            migrationBuilder.DropIndex(
                name: "IX_Stations_SearchName",
                table: "Stations");

            migrationBuilder.DropIndex(
                name: "IX_Stations_VariantKey",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "AlternateStreamUrl",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "ArtworkUrl",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "Availability",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "Bitrate",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "ClickCount",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "ClickTrend",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "Codec",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "ConsecutiveFailedChecks",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "Country",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "CountryCode",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "FirstSeenAt",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "HasHttpsStream",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "Homepage",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "IsHls",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "IsPrimaryVariant",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "Language",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "LastSeenAt",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "Region",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "SampleKey",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "SearchName",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "SearchRegion",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "SourceChangedAt",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "SourceCheckOk",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "SourceCheckedAt",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "StreamUrl",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "VariantKey",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "Votes",
                table: "Stations");

        }
    }
}
