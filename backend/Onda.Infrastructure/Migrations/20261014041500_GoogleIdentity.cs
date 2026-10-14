using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
namespace Onda.Infrastructure.Migrations;

[DbContext(typeof(OndaDbContext))]
[Migration("20261014041500_GoogleIdentity")]
public class GoogleIdentity : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "GoogleSubject", table: "ListenerAccounts", type: "nvarchar(255)", maxLength: 255, nullable: true, collation: OndaDbContext.BinaryCollation);
        migrationBuilder.CreateIndex(name: "IX_ListenerAccounts_GoogleSubject", table: "ListenerAccounts", column: "GoogleSubject", unique: true, filter: "[GoogleSubject] IS NOT NULL");
    }
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_ListenerAccounts_GoogleSubject", table: "ListenerAccounts");
        migrationBuilder.DropColumn(name: "GoogleSubject", table: "ListenerAccounts");
    }
}
