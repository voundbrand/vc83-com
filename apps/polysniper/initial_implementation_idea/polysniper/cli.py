"""PolySniper CLI — run scans, place trades, monitor positions."""
import json
import time
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from polysniper.config import Config
from polysniper.logger import log

console = Console()


@click.group()
@click.option("--mode", type=click.Choice(["paper", "live"]), default="paper",
              help="Trading mode: paper (simulated) or live (real money)")
@click.pass_context
def main(ctx, mode):
    """PolySniper — Opus 4.6-powered Polymarket arbitrage engine."""
    ctx.ensure_object(dict)
    ctx.obj["mode"] = mode

    cfg = Config.from_env()
    errors = cfg.validate()
    if errors:
        for e in errors:
            console.print(f"[red]Config error:[/red] {e}")
        raise click.Abort()

    ctx.obj["cfg"] = cfg

    if mode == "live":
        console.print(Panel(
            "[bold red]LIVE TRADING MODE[/bold red]\n"
            "Real money will be used. Ensure risk limits are set.",
            title="WARNING",
            border_style="red",
        ))


@main.command()
@click.option("--limit", default=50, help="Max markets to analyze")
@click.pass_context
def s12(ctx, limit):
    """Run S12: Resolution Criteria Exploitation scan."""
    from polysniper.strategies.s12_resolution import S12Scanner
    from polysniper.engine.trader import Trader
    from polysniper.engine.risk import RiskManager

    scanner = S12Scanner()
    trader = Trader(mode=ctx.obj["mode"])
    risk = RiskManager()

    signals = scanner.scan(limit=limit)
    _display_signals(signals, "S12: Resolution Criteria")

    if signals and click.confirm(f"\nPlace {len(signals)} trade(s)?"):
        for signal in signals:
            check = risk.check_trade(signal)
            if check["approved"]:
                signal["position_usd"] = check["adjusted_size"]
                result = trader.place_order(signal)
                risk.record_trade(signal, result)
            else:
                console.print(f"[yellow]Rejected:[/yellow] {check['reason']}")


@main.command()
@click.option("--limit", default=30, help="Max markets to assess")
@click.pass_context
def s18(ctx, limit):
    """Run S18: Long-Tail Market Sniping scan."""
    from polysniper.strategies.s18_longtail import S18Scanner
    from polysniper.engine.trader import Trader
    from polysniper.engine.risk import RiskManager

    scanner = S18Scanner()
    trader = Trader(mode=ctx.obj["mode"])
    risk = RiskManager()

    signals = scanner.scan(max_analyses=limit)
    _display_signals(signals, "S18: Long-Tail Sniping")

    if signals and click.confirm(f"\nPlace {len(signals)} limit order(s)?"):
        for signal in signals:
            check = risk.check_trade(signal)
            if check["approved"]:
                signal["position_usd"] = check["adjusted_size"]
                result = trader.place_order(signal)
                risk.record_trade(signal, result)
            else:
                console.print(f"[yellow]Rejected:[/yellow] {check['reason']}")


@main.command()
@click.option("--build-graph", is_flag=True, help="Build/rebuild the causal graph")
@click.option("--analyze-chains", is_flag=True, help="Analyze multi-hop chains")
@click.pass_context
def s05(ctx, build_graph, analyze_chains):
    """Run S05: Conditional Probability Chain Analysis."""
    from polysniper.strategies.s05_chains import S05Scanner

    scanner = S05Scanner()

    if build_graph:
        console.print("[bold]Building causal graph (this may take a while + ~$50-100 API cost)...[/bold]")
        if click.confirm("Continue?"):
            graph = scanner.build_graph()
            console.print(f"[green]Graph built:[/green] {len(graph.edges)} causal edges")
        return

    if analyze_chains:
        results = scanner.analyze_chains(limit=10)
        console.print(f"\n[bold]Multi-Hop Chain Analysis ({len(results)} opportunities):[/bold]")
        for r in results:
            a = r["analysis"]
            console.print(f"\n  Chain ({r['chain_length']} hops): {r['chain']}")
            console.print(f"  Mispricing: {a.get('mispricing_pct', 0):+.1f}%  |  "
                          f"Confidence: {a.get('confidence', 0)}%  |  "
                          f"Side: {a.get('side', '?')}")
        return

    # Default: single monitoring pass
    console.print("[bold]Running S05 monitoring pass...[/bold]")
    prices = scanner.get_current_prices()
    # First pass just establishes baseline
    console.print(f"Baseline prices captured for {len(prices)} markets.")
    console.print("Run again in a few minutes to detect movements.")


@main.command()
@click.option("--interval", default=300, help="Seconds between scans")
@click.option("--strategies", default="s12,s18", help="Comma-separated strategies to run")
@click.pass_context
def monitor(ctx, interval, strategies):
    """Continuous monitoring loop — scans on interval."""
    strats = [s.strip().lower() for s in strategies.split(",")]

    console.print(Panel(
        f"Monitoring: {', '.join(strats)}\n"
        f"Interval: {interval}s\n"
        f"Mode: {ctx.obj['mode']}",
        title="PolySniper Monitor",
    ))

    while True:
        console.print(f"\n[dim]Scan at {time.strftime('%H:%M:%S')}...[/dim]")

        if "s12" in strats:
            from polysniper.strategies.s12_resolution import S12Scanner
            signals = S12Scanner().scan(limit=20)
            if signals:
                _display_signals(signals, "S12")

        if "s18" in strats:
            from polysniper.strategies.s18_longtail import S18Scanner
            signals = S18Scanner().scan(max_analyses=15)
            if signals:
                _display_signals(signals, "S18")

        console.print(f"[dim]Next scan in {interval}s...[/dim]")
        time.sleep(interval)


@main.command()
@click.pass_context
def status(ctx):
    """Show current portfolio status, paper trades, and API costs."""
    from polysniper.engine.risk import RiskManager
    from polysniper.engine.trader import Trader

    risk = RiskManager()
    trader = Trader(mode=ctx.obj["mode"])

    stats = risk.get_stats()
    paper_trades = trader.get_paper_trades()

    console.print(Panel(
        f"Total trades: {stats['total_trades']}\n"
        f"Today's volume: ${stats['daily_volume_usd']:.0f} / ${stats['daily_limit_remaining'] + stats['daily_volume_usd']:.0f}\n"
        f"Remaining today: ${stats['daily_limit_remaining']:.0f}",
        title="Portfolio Status",
    ))

    if paper_trades:
        table = Table(title=f"Paper Trades ({len(paper_trades)} total)")
        table.add_column("Time", style="dim")
        table.add_column("Strategy")
        table.add_column("Side")
        table.add_column("Size")
        table.add_column("Edge")
        table.add_column("Market")

        for t in paper_trades[-10:]:
            table.add_row(
                t.get("timestamp", "")[:19],
                t.get("strategy", "?"),
                t.get("side", "?"),
                f"${t.get('size_usd', 0):.0f}",
                f"{t.get('edge_pct', 0):.1f}%",
                t.get("question", "")[:40],
            )
        console.print(table)


def _display_signals(signals: list[dict], strategy_name: str):
    """Pretty-print trade signals."""
    if not signals:
        console.print(f"[dim]{strategy_name}: No signals found.[/dim]")
        return

    table = Table(title=f"{strategy_name} — {len(signals)} Signal(s)")
    table.add_column("Side", style="bold")
    table.add_column("Edge")
    table.add_column("Conf.")
    table.add_column("Size")
    table.add_column("Liquidity")
    table.add_column("Market")

    for s in signals:
        side_style = "green" if s.get("side") == "YES" else "red"
        table.add_row(
            f"[{side_style}]{s.get('side', '?')}[/{side_style}]",
            f"{s.get('edge_pct', 0):.1f}%",
            f"{s.get('confidence', 0)}%",
            f"${s.get('position_usd', 0):.0f}",
            f"${s.get('liquidity', 0):,.0f}" if s.get("liquidity") else "?",
            s.get("question", "")[:50],
        )

    console.print(table)

    for s in signals:
        console.print(f"\n  [bold]{s.get('question', '')[:70]}[/bold]")
        console.print(f"  Reasoning: {s.get('reasoning', '')[:120]}")


if __name__ == "__main__":
    main()
