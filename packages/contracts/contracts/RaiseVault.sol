// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardTransient} from
    "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

interface IGovToken {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

/// @dev Lifecycle of a single milestone tranche. Mirrors shared MilestoneStatus.
enum MilestoneStatus {
    Pending,
    Active,
    Passed,
    Failed,
    Released
}

/**
 * @title RaiseVault
 * @notice Custodies investor USDC for one raise and releases it tranche-by-tranche.
 *         Each contribution mints proportional (soulbound) GovToken voting power.
 *         The governor releases or fails milestones in order; a failed milestone
 *         opens pro-rata refunds of whatever USDC remains in the vault.
 * @dev Cloneable: deployed once as an implementation and used per-campaign via an
 *      EIP-1167 minimal proxy, so config lives in storage set by initialize().
 */
contract RaiseVault is Initializable, ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    struct Milestone {
        uint16 pctBps; // share of the total raise, in basis points
        MilestoneStatus status;
        uint64 deadline; // informational; the governor enforces timing via votes
    }

    uint256 private constant BPS = 10_000;

    IERC20 public usdc;
    IGovToken public govToken;
    address public founder;
    address public governor;
    address public feeRecipient;
    uint16 public protocolFeeBps;
    uint64 public fundingDeadline;

    Milestone[] public milestones;
    uint256 public currentMilestone; // index of the next milestone to act on

    uint256 public totalRaised;
    mapping(address => uint256) public contributions;

    bool public refundsOpen;
    uint256 public refundPool; // USDC snapshot taken when refunds open

    error FundingClosed();
    error ZeroAmount();
    error NotGovernor();
    error OutOfOrder();
    error NotPending();
    error RefundsNotOpen();
    error NothingToRefund();
    error BadSchedule();

    event Contributed(address indexed investor, uint256 amount, uint256 votesMinted);
    event MilestoneReleased(uint256 indexed index, uint256 toFounder, uint256 fee);
    event MilestoneFailed(uint256 indexed index, uint256 refundPool);
    event Refunded(address indexed investor, uint256 amount);

    modifier onlyGovernor() {
        if (msg.sender != governor) revert NotGovernor();
        _;
    }

    /// @dev Lock the implementation so only clones can be initialized.
    constructor() {
        _disableInitializers();
    }

    function initialize(
        IERC20 usdc_,
        IGovToken govToken_,
        address founder_,
        address governor_,
        address feeRecipient_,
        uint16 protocolFeeBps_,
        uint64 fundingDeadline_,
        uint16[] memory pctBps_,
        uint64[] memory deadlines_
    ) external initializer {
        if (pctBps_.length == 0 || pctBps_.length != deadlines_.length) revert BadSchedule();
        uint256 sum = 0;
        for (uint256 i; i < pctBps_.length; ++i) {
            sum += pctBps_[i];
            milestones.push(Milestone(pctBps_[i], MilestoneStatus.Pending, deadlines_[i]));
        }
        if (sum != BPS) revert BadSchedule();

        usdc = usdc_;
        govToken = govToken_;
        founder = founder_;
        governor = governor_;
        feeRecipient = feeRecipient_;
        protocolFeeBps = protocolFeeBps_;
        fundingDeadline = fundingDeadline_;
    }

    /// @notice Contribute USDC and receive proportional voting power. CEI + guard.
    function contribute(uint256 amount) external nonReentrant {
        if (block.timestamp >= fundingDeadline || refundsOpen) revert FundingClosed();
        if (amount == 0) revert ZeroAmount();

        contributions[msg.sender] += amount;
        totalRaised += amount;

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        govToken.mint(msg.sender, amount);

        emit Contributed(msg.sender, amount, amount);
    }

    /// @notice Release the next milestone tranche to the founder, net of protocol fee.
    function releaseMilestone(uint256 index) external onlyGovernor nonReentrant {
        Milestone storage m = _take(index);
        m.status = MilestoneStatus.Released;

        uint256 gross = (totalRaised * m.pctBps) / BPS;
        // The fee is intentionally charged on the actual (floored) tranche paid out,
        // so the division before this multiplication is correct, not a precision bug.
        // slither-disable-next-line divide-before-multiply
        uint256 fee = (gross * protocolFeeBps) / BPS;
        uint256 toFounder = gross - fee;

        if (fee > 0) usdc.safeTransfer(feeRecipient, fee);
        usdc.safeTransfer(founder, toFounder);

        emit MilestoneReleased(index, toFounder, fee);
    }

    /// @notice Fail the next milestone, opening pro-rata refunds of the remainder.
    function markFailed(uint256 index) external onlyGovernor {
        Milestone storage m = _take(index);
        m.status = MilestoneStatus.Failed;

        refundsOpen = true;
        refundPool = usdc.balanceOf(address(this));

        emit MilestoneFailed(index, refundPool);
    }

    /// @notice Claim a refund proportional to your share of the original raise.
    function claimRefund() external nonReentrant {
        if (!refundsOpen) revert RefundsNotOpen();
        uint256 contributed = contributions[msg.sender];
        if (contributed == 0) revert NothingToRefund();

        uint256 amount = (refundPool * contributed) / totalRaised;
        contributions[msg.sender] = 0;

        govToken.burn(msg.sender, contributed);
        if (amount > 0) usdc.safeTransfer(msg.sender, amount);

        emit Refunded(msg.sender, amount);
    }

    function milestoneCount() external view returns (uint256) {
        return milestones.length;
    }

    /// @dev Enforce sequential action and Pending status; advance the pointer.
    function _take(uint256 index) private returns (Milestone storage m) {
        if (index != currentMilestone) revert OutOfOrder();
        m = milestones[index];
        if (m.status != MilestoneStatus.Pending) revert NotPending();
        ++currentMilestone;
    }
}
