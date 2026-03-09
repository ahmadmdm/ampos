import SwiftUI
import UIKit

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> ActivityHostViewController {
        ActivityHostViewController(items: items)
    }

    func updateUIViewController(_ uiViewController: ActivityHostViewController, context: Context) {
        uiViewController.update(items: items)
    }
}

final class ActivityHostViewController: UIViewController {
    private var items: [Any]
    private var hasPresentedActivityController = false

    init(items: [Any]) {
        self.items = items
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .formSheet
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        guard !hasPresentedActivityController else { return }
        hasPresentedActivityController = true
        presentActivityController()
    }

    func update(items: [Any]) {
        self.items = items
    }

    private func presentActivityController() {
        UIApplication.shared.endEditing()

        let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
        controller.completionWithItemsHandler = { [weak self] _, _, _, _ in
            self?.dismiss(animated: true)
        }

        if let popover = controller.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = CGRect(
                x: view.bounds.midX,
                y: view.bounds.midY,
                width: 1,
                height: 1
            )
            popover.permittedArrowDirections = []
        }

        present(controller, animated: true)
    }
}

private extension UIApplication {
    func endEditing() {
        sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
}
